import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, plan, creditCard, cpfCnpj, postalCode, addressNumber, phone, userId } = req.body;
  const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
  const ASAAS_API_URL = process.env.ASAAS_API_URL;

  if (!ASAAS_API_KEY || !ASAAS_API_URL) {
    return res.status(500).json({ error: 'Asaas API configuration missing' });
  }

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
    const paymentBody = {
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value: parseFloat(plan.price),
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      description: `Assinatura Plano ${plan.name} - Bolão Multi Tenancy`,
      externalReference: `USER_${userId}`,
      creditCard: {
        holderName: name,
        number: creditCard.number.replace(/\s/g, ''),
        expiryMonth: creditCard.expiry.split('/')[0],
        expiryYear: '20' + creditCard.expiry.split('/')[1],
        ccv: creditCard.cvc
      },
      creditCardHolderInfo: {
        name: name,
        email: email,
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
        postalCode: postalCode.replace(/\D/g, ''),
        addressNumber: addressNumber || '1',
        phone: phone ? phone.replace(/\D/g, '') : undefined,
      },
      remoteIp: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    };

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
      return res.status(400).json({ error: paymentData.errors[0].description });
    }

    if (paymentData.status === 'CONFIRMED' || paymentData.status === 'RECEIVED') {
      return res.status(200).json({ success: true, paymentId: paymentData.id });
    } else {
      return res.status(400).json({ error: `Pagamento não autorizado. Status: ${paymentData.status}` });
    }

  } catch (error: any) {
    console.error('Asaas Integration Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
