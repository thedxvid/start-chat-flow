// send-password-reset v9 - redeploy para consistencia
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, redirectTo } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

<<<<<<< HEAD
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const SITE_URL = Deno.env.get('SITE_URL') || 'https://sistemastart.com';
=======
    try {
        const { email } = await req.json();
>>>>>>> 8f91f6eebb11948f55e43810191438dce55df35a

    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Configuração de servidor incompleta' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Gerar o link de reset via Supabase Admin
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: redirectTo || `${SITE_URL}/auth`,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('Erro ao gerar link de recuperação:', linkError);
      return new Response(JSON.stringify({ error: 'Erro ao gerar link de recuperação' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

<<<<<<< HEAD
    const resetLink = linkData.properties.action_link;
    const resend = new Resend(RESEND_API_KEY);
=======
        // Segurança: nunca confiar em redirectTo vindo do cliente
        // O link sempre aponta para a rota oficial de recuperação
        const safeRedirectTo = `${SITE_URL}/auth`;

        // Gerar o link de reset via Supabase Admin
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: {
                redirectTo: safeRedirectTo,
            },
        });
>>>>>>> 8f91f6eebb11948f55e43810191438dce55df35a

    const emailHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <meta name="format-detection" content="telephone=no" />
  <title>Redefinir sua senha — Sistema Start</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;-webkit-font-smoothing:antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f5f5f0;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;">

          <!-- Logo / Header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="background-color:#c9a84c;border-radius:14px;padding:12px 24px;">
                    <span style="font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:0.5px;color:#ffffff;">Sistema Start</span>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0 0;font-size:12px;color:#8a8a8a;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;letter-spacing:0.3px;">by Nathalia Ouro</p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.06);">

              <!-- Card Top accent -->
              <tr>
                <td style="height:4px;background-color:#c9a84c;display:block;line-height:4px;font-size:4px;">&nbsp;</td>
              </tr>

              <!-- Card Body -->
              <tr>
                <td style="padding:48px 48px 40px 48px;">

                  <!-- Icon -->
                  <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
                    <tr>
                      <td style="width:52px;height:52px;background-color:#faf5e9;border-radius:14px;text-align:center;vertical-align:middle;">
                        <span style="font-size:24px;line-height:52px;display:block;">🔐</span>
                      </td>
                    </tr>
                  </table>

                  <!-- Title -->
                  <h1 style="margin:0 0 12px 0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:26px;font-weight:700;letter-spacing:-0.5px;color:#1a1a1a;line-height:1.2;">Redefinir sua senha</h1>

                  <!-- Subtitle -->
                  <p style="margin:0 0 32px 0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:16px;color:#666666;line-height:1.6;">
                    Recebemos uma solicitação para redefinir a senha da sua conta no <strong style="color:#1a1a1a;font-weight:600;">Sistema Start</strong>. Clique no botão abaixo para criar uma nova senha.
                  </p>

                  <!-- CTA Button -->
                  <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:32px;">
                    <tr>
                      <td style="border-radius:12px;background-color:#c9a84c;">
                        <a href="${resetLink}"
                           style="display:inline-block;padding:14px 32px;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.2px;border-radius:12px;">
                          Redefinir minha senha &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Divider -->
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
                    <tr>
                      <td style="height:1px;background-color:#f0ede5;font-size:1px;line-height:1px;">&nbsp;</td>
                    </tr>
                  </table>

                  <!-- Alt link -->
                  <p style="margin:0 0 8px 0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#8a8a8a;line-height:1.5;">
                    Se o botão não funcionar, copie e cole este link no navegador:
                  </p>
                  <p style="margin:0;word-break:break-all;">
                    <a href="${resetLink}" style="font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#c9a84c;text-decoration:none;">${resetLink}</a>
                  </p>

                </td>
              </tr>

              <!-- Warning box -->
              <tr>
                <td style="padding:0 48px 40px 48px;">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td style="background-color:#faf5e9;border-radius:12px;padding:16px 20px;">
                        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#8a6a1a;line-height:1.6;">
                          ⚠️ <strong>Este link expira em 1 hora.</strong> Se você não solicitou a redefinição de senha, pode ignorar este email com segurança — sua senha não será alterada.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 0 0 0;text-align:center;">
              <p style="margin:0 0 6px 0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#aaaaaa;">Sistema Start by Nathalia Ouro</p>
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#bbbbbb;">Este é um email automático. Por favor, não responda.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Sistema Start <noreply@sistemastart.com>',
      to: [email],
      subject: '🔐 Redefinição de senha — Sistema Start',
      text: `Olá!\n\nRecebemos uma solicitação para redefinir sua senha no Sistema Start.\n\nClique no link abaixo ou cole no seu navegador para criar uma nova senha:\n${resetLink}\n\nEste link expira em 1 hora.\n\nSe você não solicitou isso, ignore este email.`,
      html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redefinir sua senha - Sistema Start</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f0;font-family:Arial,sans-serif;color:#1a1a1a;">
  <div style="max-width:560px;margin:40px auto;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.06);">
    <div style="height:4px;background-color:#c9a84c;"></div>
    <div style="padding:48px;">
      <h1 style="margin:0 0 20px 0;font-size:24px;font-weight:700;">Redefinir sua senha</h1>
      <p style="margin-bottom:30px;line-height:1.6;color:#666;">Recebemos uma solicitação para redefinir sua senha na sua conta do <strong>Sistema Start</strong>. Clique no botão abaixo para criar uma nova senha:</p>
      
      <div style="text-align:center;margin:40px 0;">
        <a href="${resetLink}" style="background-color:#c9a84c;color:#ffffff;padding:16px 32px;text-decoration:none;border-radius:12px;font-weight:600;display:inline-block;">Redefinir minha senha</a>
      </div>

      <p style="font-size:13px;color:#8a8a8a;margin-top:40px;">Se o botão não funcionar, copie e cole este link no seu navegador:</p>
      <p style="font-size:12px;word-break:break-all;color:#c9a84c;">${resetLink}</p>

      <div style="background-color:#faf5e9;border-radius:12px;padding:20px;margin-top:40px;">
        <p style="margin:0;font-size:13px;color:#8a6a1a;line-height:1.6;">
          ⚠️ <strong>Este link expira em 1 hora.</strong> Se você não solicitou a redefinição, ignore este email.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`,
      headers: {
        'X-Entity-Ref-ID': `reset-${Date.now()}`,
        'List-Unsubscribe': `<mailto:noreply@sistemastart.com?subject=unsubscribe>`,
      },
    });

    if (emailError) {
      console.error('Erro ao enviar email:', emailError);
      return new Response(JSON.stringify({ error: 'Erro ao enviar email de recuperação' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: emailData?.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Erro inesperado:', err);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
