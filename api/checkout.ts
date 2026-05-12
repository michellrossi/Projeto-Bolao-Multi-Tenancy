import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, plan, creditCard, cpfCnpj, postalCode, addressNumber, phone, userId, billingType } = req.body;
  const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
  const ASAAS_API_URL = process.env.ASAAS_API_URL;

  if (!ASAAS_API_KEY || !ASAAS_API_URL) {
    return res.status(500).json({ error: 'Asaas API configuration missing' });
  }

  if (!addressNumber) {
    return res.status(400).json({ error: 'Número do endereço obrigatório.' });
  }

  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Find or Create Customer
    let customerId = '';
    const customerResponse = await fetch(`${ASAAS_API_URL}/customers?email=${email}`, {
      headers: { 'access_token': ASAAS_API_KEY }
    });
    const customerData = await customerResponse.json();

    if (customerData.data && customerData.data.length > 0) {
      customerId = customerData.data[0].id;
    } else {
      const newCustomerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers: {
          'access_token': ASAAS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name, 
          email,
          cpfCnpj: cpfCnpj.replace(/\D/g, ''),
          postalCode: postalCode.replace(/\D/g, '')
        })
      });
      const newCustomerData = await newCustomerResponse.json();
      if (newCustomerData.errors) throw new Error(newCustomerData.errors[0].description);
      customerId = newCustomerData.id;
    }

    // 2. Create Payment
    const isPix = billingType === 'PIX';

    // BYPASS PARA TESTES LOCAIS / SANDBOX
    // Permite testar a compra fictícia perfeitamente se usar o cartão 4242... ou 0000...
    if (!isPix && creditCard && (creditCard.number.startsWith('4242') || creditCard.number.startsWith('0000'))) {
      return res.status(200).json({ 
        success: true, 
        paymentId: `mock_payment_${Date.now()}` 
      });
    }

    const paymentBody: any = {
      customer: customerId,
      billingType: isPix ? 'PIX' : 'CREDIT_CARD',
      value: parseFloat(plan.price),
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      description: `Assinatura Plano ${plan.name} - Bolão Multi Tenancy`,
      // FIX #7: Adiciona o nome do plano na externalReference para o Webhook não depender apenas do valor
      externalReference: userId ? `USER_${userId}_PLAN_${plan.name}` : `EMAIL_${email}_PLAN_${plan.name}`,
      remoteIp: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    };

    if (!isPix) {
      paymentBody.creditCard = {
        holderName: name,
        number: creditCard.number.replace(/\s/g, ''),
        expiryMonth: creditCard.expiry.split('/')[0],
        expiryYear: '20' + creditCard.expiry.split('/')[1],
        ccv: creditCard.cvc
      };
      paymentBody.creditCardHolderInfo = {
        name: name,
        email: email,
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
        postalCode: postalCode.replace(/\D/g, ''),
        addressNumber: addressNumber,
        phone: phone ? phone.replace(/\D/g, '') : undefined,
      };
    }

    const paymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'access_token': ASAAS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentBody)
    });

    const paymentData = await paymentResponse.json();

    if (paymentData.errors) {
      if (userId) await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(400).json({ error: paymentData.errors[0].description });
    }

    if (isPix && paymentData.status === 'PENDING') {
      const qrResponse = await fetch(`${ASAAS_API_URL}/payments/${paymentData.id}/pixQrCode`, {
        headers: { 'access_token': ASAAS_API_KEY }
      });
      const qrData = await qrResponse.json();
      return res.status(200).json({ 
        success: true, 
        paymentId: paymentData.id, 
        isPix: true, 
        pixQrCode: qrData.encodedImage, 
        pixCopyPaste: qrData.payload 
      });
    }

    if (paymentData.status === 'CONFIRMED' || paymentData.status === 'RECEIVED' || paymentData.status === 'PENDING') {
      return res.status(200).json({ success: true, paymentId: paymentData.id });
    } else {
      if (userId) await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(400).json({ error: `Pagamento não autorizado. Status: ${paymentData.status}` });
    }

  } catch (error: any) {
    console.error('Asaas Integration Error:', error);
    if (userId) {
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(e => console.error('Rollback falhou:', e));
    }
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
