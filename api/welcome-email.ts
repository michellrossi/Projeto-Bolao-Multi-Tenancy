import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Endpoint seguro para disparo de e-mail de boas-vindas pós-compra.
 * Usa o Resend (https://resend.com) — free tier cobre 3.000 e-mails/mês.
 * Se preferir outro provider (SendGrid, AWS SES), só trocar o fetch abaixo.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    // Não bloqueia o fluxo se não configurado — apenas loga
    console.warn('[welcome-email] RESEND_API_KEY not configured. Skipping.');
    return res.status(200).json({ skipped: true });
  }

  const { name, email, plan, code } = req.body as {
    name: string;
    email: string;
    plan: { name: string; price: string; participants: number };
    code: string;
  };

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Bem-vindo ao Bolão 2026!</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:sans-serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:#111;border-radius:24px;overflow:hidden;border:1px solid #222;">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#00ff85 0%,#00b35a 100%);padding:40px 40px 32px;text-align:center;">
        <img src="https://iili.io/BZG2miP.png" alt="Bolão 2026" style="height:56px;width:auto;" />
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:40px;">
        <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;letter-spacing:-1px;">
          Bem-vindo, ${name}! 🎉
        </h1>
        <p style="margin:0 0 24px;color:#aaa;font-size:14px;">
          Seu acesso ao <strong style="color:#00ff85;">Plano ${plan.name}</strong> foi ativado com sucesso.
        </p>

        <!-- Code Box -->
        <div style="background:#0a0a0a;border:1px solid #222;border-radius:16px;padding:24px;text-align:center;margin-bottom:28px;">
          <p style="margin:0 0 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#555;">
            Seu Código de Ativação
          </p>
          <p style="margin:0;font-size:36px;font-family:monospace;font-weight:900;letter-spacing:8px;color:#00ff85;">
            ${code}
          </p>
          <p style="margin:8px 0 0;font-size:10px;color:#444;text-transform:uppercase;letter-spacing:1px;">
            Guarde este código em local seguro
          </p>
        </div>

        <!-- Plan Details -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
          <tr>
            <td style="padding:10px 14px;background:#161616;border-radius:12px 12px 0 0;border-bottom:1px solid #222;font-size:12px;">
              <span style="color:#555;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Plano</span>
              <span style="float:right;font-weight:900;color:#fff;">${plan.name}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 14px;background:#161616;border-bottom:1px solid #222;font-size:12px;">
              <span style="color:#555;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Participantes</span>
              <span style="float:right;font-weight:900;color:#fff;">Até ${plan.participants}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 14px;background:#161616;border-radius:0 0 12px 12px;font-size:12px;">
              <span style="color:#555;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Valor pago</span>
              <span style="float:right;font-weight:900;color:#00ff85;">R$ ${plan.price}</span>
            </td>
          </tr>
        </table>

        <!-- CTA -->
        <div style="text-align:center;">
          <a href="${process.env.APP_URL ?? 'https://bolao2026.com'}/login" 
             style="display:inline-block;padding:16px 40px;background:#00ff85;color:#0a0a0a;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:3px;border-radius:14px;text-decoration:none;">
            Acessar Plataforma
          </a>
        </div>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:24px 40px;border-top:1px solid #222;text-align:center;">
        <p style="margin:0;font-size:10px;color:#333;text-transform:uppercase;letter-spacing:2px;">
          © 2026 Bolão 2026 · Todos os direitos reservados
        </p>
        <p style="margin:8px 0 0;font-size:10px;color:#2a2a2a;">
          <a href="${process.env.APP_URL ?? 'https://bolao2026.com'}/privacidade" style="color:#333;text-decoration:none;">Política de Privacidade</a>
          &nbsp;·&nbsp;
          <a href="${process.env.APP_URL ?? 'https://bolao2026.com'}/termos" style="color:#333;text-decoration:none;">Termos de Uso</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Bolão 2026 <noreply@bolao2026.com>',
        to: [email],
        subject: `🏆 Acesso liberado! Seu código: ${code}`,
        html,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('[welcome-email] Resend error:', err);
      return res.status(500).json({ error: 'Falha ao enviar e-mail' });
    }

    return res.status(200).json({ sent: true });
  } catch (error) {
    console.error('[welcome-email] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
