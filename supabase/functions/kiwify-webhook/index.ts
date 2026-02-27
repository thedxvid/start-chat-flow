// kiwify-webhook v9 - redeploy para consistencia
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KiwifyWebhookData {
  order_id: string;
  order_status: string;
  customer_email: string;
  customer_name?: string;
  product_id: string;
  product_name: string;
  created_at: string;
  updated_at: string;
}

// Função para gerar código de acesso único
function generateAccessCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'START-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Função para enviar email com código de acesso
async function sendAccessCodeEmail(email: string, name: string, accessCode: string) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY não configurada, email não será enviado');
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Sistema Start <noreply@sistemastart.com>',
        to: [email],
        subject: '🎉 Seu código de acesso ao Sistema Start',
        text: `Olá ${name}!\n\nParabéns! Seu pagamento foi confirmado com sucesso.\n\nSeu código de acesso: ${accessCode}\n\nComo acessar o sistema:\n1. Acesse: https://sistemastart.com/auth\n2. Clique em "Cadastrar"\n3. Digite seu código: ${accessCode}\n4. Preencha seus dados e comece a usar!\n\nBem-vindo ao time!`,
        html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
</head>
<body style="margin:0;padding:0;background-color:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f5f5f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;">

        <!-- Logo -->
        <tr>
          <td align="center" style="padding-bottom:32px;">
            <table cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="background-color:#c9a84c;border-radius:14px;padding:12px 24px;">
                  <span style="font-size:15px;font-weight:700;letter-spacing:0.5px;color:#ffffff;">Sistema Start</span>
                </td>
              </tr>
            </table>
            <p style="margin:16px 0 0 0;font-size:12px;color:#8a8a8a;letter-spacing:0.3px;">by Nathalia Ouro</p>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.06);">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr><td style="height:4px;background-color:#c9a84c;font-size:4px;line-height:4px;">&nbsp;</td></tr>

              <tr><td style="padding:48px 48px 16px 48px;">
                <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
                  <tr><td style="width:52px;height:52px;background-color:#faf5e9;border-radius:14px;text-align:center;vertical-align:middle;">
                    <span style="font-size:24px;line-height:52px;display:block;">🚀</span>
                  </td></tr>
                </table>

                <h1 style="margin:0 0 12px 0;font-size:26px;font-weight:700;letter-spacing:-0.5px;color:#1a1a1a;line-height:1.2;">Bem-vindo ao Sistema Start!</h1>
                <p style="margin:0 0 8px 0;font-size:16px;color:#666666;line-height:1.6;">
                  Olá, <strong style="color:#1a1a1a;">${name}</strong>! 🎉 Seu pagamento foi confirmado com sucesso!
                </p>
                <p style="margin:0 0 28px 0;font-size:16px;color:#666666;line-height:1.6;">
                  Agora você tem acesso completo ao sistema. Use o código abaixo para criar sua conta.
                </p>

                <!-- Access Code Box -->
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
                  <tr><td style="background-color:#faf5e9;border:1px solid #e8dcc0;border-radius:12px;padding:24px;text-align:center;">
                    <p style="margin:0 0 12px 0;font-size:14px;color:#8a6a1a;font-weight:600;">🔑 Seu Código de Acesso</p>
                    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
                      <tr><td style="background-color:#c9a84c;color:#ffffff;padding:14px 28px;border-radius:10px;font-family:monospace,'Courier New',monospace;font-size:22px;font-weight:700;letter-spacing:3px;">${accessCode}</td></tr>
                    </table>
                    <p style="margin:14px 0 0 0;font-size:12px;color:#8a6a1a;">Guarde este código com segurança</p>
                  </td></tr>
                </table>

                <!-- Steps -->
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
                  <tr><td style="padding:0;">
                    <p style="margin:0 0 12px 0;font-size:15px;font-weight:600;color:#1a1a1a;">📋 Como acessar:</p>
                    <table cellpadding="0" cellspacing="0" role="presentation">
                      <tr><td style="padding:4px 0;font-size:14px;color:#666666;line-height:1.7;">1. Acesse <a href="https://sistemastart.com/auth" style="color:#c9a84c;font-weight:600;text-decoration:none;">sistemastart.com/auth</a></td></tr>
                      <tr><td style="padding:4px 0;font-size:14px;color:#666666;line-height:1.7;">2. Clique em <strong style="color:#1a1a1a;">"Cadastrar"</strong></td></tr>
                      <tr><td style="padding:4px 0;font-size:14px;color:#666666;line-height:1.7;">3. Insira o código: <strong style="color:#1a1a1a;">${accessCode}</strong></td></tr>
                      <tr><td style="padding:4px 0;font-size:14px;color:#666666;line-height:1.7;">4. Preencha seus dados e comece a usar!</td></tr>
                    </table>
                  </td></tr>
                </table>

                <!-- CTA Button -->
                <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;" width="100%">
                  <tr><td align="center">
                    <a href="https://sistemastart.com/auth" style="display:inline-block;padding:14px 40px;background-color:#c9a84c;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;letter-spacing:0.2px;">Acessar o Sistema &rarr;</a>
                  </td></tr>
                </table>
              </td></tr>

              <!-- Tip -->
              <tr><td style="padding:0 48px 40px 48px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr><td style="background-color:#faf5e9;border-radius:12px;padding:16px 20px;">
                    <p style="margin:0;font-size:13px;color:#8a6a1a;line-height:1.6;">
                      💡 Após criar sua conta, você terá acesso ilimitado à nossa mentora expert em marketing digital.
                    </p>
                  </td></tr>
                </table>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:32px 0 0 0;text-align:center;">
            <p style="margin:0 0 6px 0;font-size:13px;color:#aaaaaa;">Sistema Start by Nathalia Ouro</p>
            <p style="margin:0;font-size:12px;color:#bbbbbb;">Este é um email automático. Por favor, não responda.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
      }),
    });

    if (response.ok) {
      console.log('Email com código de acesso enviado com sucesso para:', email);
    } else {
      const error = await response.text();
      console.error('Erro ao enviar email:', error);
    }
  } catch (error) {
    console.error('Erro no envio do email:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const webhookData: KiwifyWebhookData = await req.json();

    console.log('Received Kiwify webhook:', webhookData);

    // Gerar código de acesso único
    const accessCode = generateAccessCode();

    // Determine plan type and expiration based on product
    let planType = 'premium';
    let expiresAt = null;

    // Set expiration date (180 days from now for premium plans - 6 months)
    if (webhookData.order_status === 'paid') {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 180);
      expiresAt = expirationDate.toISOString();
    }

    // Criar/atualizar registro de pagamento e código de acesso
    const { data: subscription, error: subscriptionError } = await supabaseClient
      .from('subscriptions')
      .upsert({
        kiwify_order_id: webhookData.order_id,
        customer_email: webhookData.customer_email,
        customer_name: webhookData.customer_name || '',
        status: webhookData.order_status === 'paid' ? 'active' : 'pending',
        plan_type: planType,
        access_code: accessCode,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'kiwify_order_id'
      });

    if (subscriptionError) {
      console.error('Error updating subscription:', subscriptionError);
      throw subscriptionError;
    }

    // Se o pagamento foi confirmado, enviar email com código de acesso
    if (webhookData.order_status === 'paid') {
      await sendAccessCodeEmail(
        webhookData.customer_email,
        webhookData.customer_name || 'Cliente',
        accessCode
      );
    }

    console.log('Webhook processado com sucesso:', {
      order_id: webhookData.order_id,
      email: webhookData.customer_email,
      status: webhookData.order_status,
      access_code: accessCode
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        access_code: accessCode,
        subscription
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});