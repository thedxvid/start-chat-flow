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
  <title>Seu Código de Acesso - Sistema Start</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;color:#333333;">
  <div style="max-width:600px;margin:20px auto;background-color:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;text-align:center;color:#ffffff;">
      <h1 style="margin:0;font-size:24px;">🚀 Bem-vindo ao Sistema Start!</h1>
    </div>
    <div style="padding:30px;">
      <h2 style="margin:0 0 20px 0;font-size:18px;">Olá, ${name}!</h2>
      <p style="margin-bottom:20px;line-height:1.6;"><strong>Parabéns!</strong> Seu pagamento foi confirmado. Agora você tem acesso completo ao sistema.</p>
      
      <div style="background-color:#f0f0ff;border:2px solid #667eea;border-radius:10px;padding:25px;text-align:center;margin-bottom:25px;">
        <p style="margin:0 0 10px 0;color:#667eea;font-weight:bold;">🔑 Seu Código de Acesso:</p>
        <div style="background-color:#667eea;color:#ffffff;padding:15px;border-radius:8px;font-family:monospace;font-size:24px;font-weight:bold;letter-spacing:2px;display:inline-block;">${accessCode}</div>
        <p style="color:#666;font-size:12px;margin-top:10px;">⚠️ Guarde este código. Você precisará dele para criar sua conta.</p>
      </div>

      <div style="margin-bottom:25px;">
        <h3 style="font-size:16px;margin-bottom:10px;">📋 Como acessar:</h3>
        <ol style="line-height:1.8;padding-left:20px;">
          <li>Acesse: <a href="https://sistemastart.com/auth" style="color:#667eea;">sistemastart.com/auth</a></li>
          <li>Clique na aba <strong>"Cadastrar"</strong></li>
          <li>Insira seu código: <strong>${accessCode}</strong></li>
          <li>Finalize seu cadastro!</li>
        </ol>
      </div>

      <div style="text-align:center;margin-top:30px;">
        <a href="https://sistemastart.com/auth" style="background:#667eea;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">🚀 Acessar Sistema Agora</a>
      </div>
    </div>
    <div style="background-color:#333;color:#999;padding:15px;text-align:center;font-size:12px;">
      Sistema Start - Mentoria Expert em Marketing Digital
    </div>
  </div>
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