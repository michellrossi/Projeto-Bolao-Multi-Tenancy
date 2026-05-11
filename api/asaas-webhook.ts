import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Usamos a SERVICE_ROLE_KEY para poder atualizar o usuário ignorando o RLS
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Segurança: Verifica o token que você vai definir no painel do Asaas
  const asaasToken = req.headers['asaas-access-token'];
  if (asaasToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
    console.error('Webhook: Token inválido ou não fornecido');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { event, payment } = req.body;

  // Monitoramos apenas os eventos de confirmação de pagamento
  if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
    // Pegamos o ID do usuário que enviamos no externalReference
    // Formato esperado: USER_uuid-do-usuario_PLAN_nome
    const parts = payment.externalReference?.split('_PLAN_');
    const userIdRaw = parts?.[0];
    const userId = userIdRaw?.replace('USER_', '');
    const planFromRef = parts?.[1];

    if (!userId) {
      console.error('Webhook: externalReference inválido', payment.externalReference);
      return res.status(400).json({ error: 'Missing userId' });
    }

    // FIX #7: Lógica de limites baseada no nome do plano enviado na referência
    let maxParticipants = 15; // Bronze (Padrão)
    let maxLeagues = 1;
    let planName = planFromRef || 'Bronze';

    if (planName === 'Ouro') {
      maxParticipants = 100;
      maxLeagues = 999;
    } else if (planName === 'Prata') {
      maxParticipants = 50;
      maxLeagues = 999;
    }

    try {
      // Atualizar o usuário no Supabase
      const { error } = await supabase
        .from('users')
        .update({ 
          has_license: true, 
          max_participants_allowed: maxParticipants,
          max_leagues_allowed: maxLeagues,
          plan_type: planName 
        })
        .eq('id', userId);

      if (error) throw error;

      console.log(`Sucesso: Plano ${planName} ativado para o usuário ${userId}`);
      return res.status(200).send('OK');
    } catch (err) {
      console.error('Webhook: Erro ao atualizar banco:', err);
      return res.status(500).json({ error: 'Internal Database Error' });
    }
  }

  // Respondemos OK para outros eventos para o Asaas não achar que deu erro
  res.status(200).send('Evento ignorado');
}
