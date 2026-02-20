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
        html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#333333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;text-align:center;border-radius:10px 10px 0 0;">
              <h1 style="margin:0;font-size:26px;color:#ffffff;font-family:Arial,sans-serif;">🚀 Bem-vindo ao Sistema Start!</h1>
              <p style="margin:10px 0 0 0;font-size:15px;color:#e8e8ff;font-family:Arial,sans-serif;">Mentoria Expert em Marketing Digital</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:30px;">
              <h2 style="margin:0 0 16px 0;color:#333333;font-family:Arial,sans-serif;font-size:20px;">Olá, ${name}!</h2>
              <p style="color:#555555;line-height:1.7;margin-bottom:25px;font-family:Arial,sans-serif;font-size:15px;">
                🎉 <strong style="color:#333333;">Parabéns!</strong> Seu pagamento foi confirmado com sucesso!
                Agora você tem acesso completo ao Sistema Start.
              </p>

              <!-- Access Code Box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#f0f0ff;border:2px solid #667eea;border-radius:10px;padding:25px;text-align:center;">
                    <p style="margin:0 0 12px 0;color:#667eea;font-weight:bold;font-family:Arial,sans-serif;font-size:16px;">🔑 Seu Código de Acesso:</p>
                    <div style="background-color:#667eea;color:#ffffff;padding:14px 24px;border-radius:8px;font-family:monospace,Courier New,monospace;font-size:24px;font-weight:bold;letter-spacing:3px;display:inline-block;">${accessCode}</div>
                    <p style="color:#666666;font-size:13px;margin:14px 0 0 0;font-family:Arial,sans-serif;">⚠️ Guarde este código com segurança. Você precisará dele para criar sua conta.</p>
                  </td>
                </tr>
              </table>

              <!-- Steps -->
              <div style="margin:25px 0;">
                <h4 style="color:#333333;margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:15px;">📋 Como acessar o sistema:</h4>
                <ol style="color:#555555;line-height:2;padding-left:20px;margin:0;font-family:Arial,sans-serif;font-size:14px;">
                  <li>Acesse: <a href="https://sistemastart.com/auth" style="color:#667eea;text-decoration:underline;">sistemastart.com/auth</a></li>
                  <li>Clique em <strong style="color:#333333;">"Cadastrar"</strong></li>
                  <li>Digite seu código de acesso: <strong style="color:#333333;">${accessCode}</strong></li>
                  <li>Preencha seus dados e comece a usar!</li>
                </ol>
              </div>

              <!-- Tip box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#e8f4fd;border-left:4px solid #2196F3;padding:14px 16px;border-radius:0 6px 6px 0;">
                    <p style="margin:0 0 6px 0;color:#1565C0;font-weight:bold;font-family:Arial,sans-serif;font-size:14px;">💡 Dica importante:</p>
                    <p style="margin:0;color:#1565C0;line-height:1.6;font-family:Arial,sans-serif;font-size:13px;">
                      Após criar sua conta, você terá acesso ilimitado à nossa mentora expert em marketing digital.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <div style="text-align:center;margin-top:28px;">
                <a href="https://sistemastart.com/auth" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;font-family:Arial,sans-serif;font-size:15px;display:inline-block;">🚀 Acessar Sistema Agora</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#333333;color:#cccccc;padding:20px;text-align:center;border-radius:0 0 10px 10px;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#cccccc;">Sistema Start - Mentoria Expert em Marketing Digital</p>
              <p style="margin:6px 0 0 0;font-size:12px;color:#aaaaaa;font-family:Arial,sans-serif;">Transforme seu marketing digital com IA</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
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