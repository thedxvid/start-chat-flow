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
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px;">🚀 Bem-vindo ao Sistema Start!</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Mentoria Expert em Marketing Digital</p>
            </div>
            
            <div style="padding: 30px; background: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 20px;">Olá, ${name}!</h2>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                🎉 <strong>Parabéns!</strong> Seu pagamento foi confirmado com sucesso! 
                Agora você tem acesso completo ao Sistema Start.
              </p>
              
              <div style="background: white; border: 2px solid #667eea; border-radius: 10px; padding: 25px; text-align: center; margin: 25px 0;">
                <h3 style="color: #667eea; margin-bottom: 15px;">🔑 Seu Código de Acesso:</h3>
                <div style="background: #667eea; color: white; padding: 15px 25px; border-radius: 8px; font-family: monospace; font-size: 24px; font-weight: bold; letter-spacing: 2px;">
                  ${accessCode}
                </div>
                <p style="color: #666; font-size: 14px; margin-top: 15px;">
                  ⚠️ Guarde este código com segurança. Você precisará dele para criar sua conta.
                </p>
              </div>
              
              <div style="margin: 25px 0;">
                <h4 style="color: #333;">📋 Como acessar o sistema:</h4>
                <ol style="color: #666; line-height: 1.8;">
                  <li>Acesse: <a href="https://sistemastart.com/auth" style="color: #667eea;">sistemastart.com/auth</a></li>
                  <li>Clique em "Cadastrar"</li>
                  <li>Digite seu código de acesso: <strong>${accessCode}</strong></li>
                  <li>Preencha seus dados e comece a usar!</li>
                </ol>
              </div>
              
              <div style="background: #e8f4fd; border-left: 4px solid #2196F3; padding: 15px; margin: 25px 0;">
                <h4 style="color: #2196F3; margin: 0 0 10px 0;">💡 Dica importante:</h4>
                <p style="color: #666; margin: 0; line-height: 1.6;">
                  Após criar sua conta, você terá acesso ilimitado à nossa mentora expert em marketing digital. 
                  Faça perguntas detalhadas para obter estratégias personalizadas!
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="https://sistemastart.com/auth" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  🚀 Acessar Sistema Agora
                </a>
              </div>
            </div>
            
            <div style="background: #333; color: #ccc; padding: 20px; text-align: center; font-size: 14px;">
              <p style="margin: 0;">Sistema Start - Mentoria Expert em Marketing Digital</p>
              <p style="margin: 5px 0 0 0; opacity: 0.8;">Transforme seu marketing digital com IA</p>
            </div>
          </div>
        `,
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
    
    // Set expiration date (30 days from now for premium plans)
    if (webhookData.order_status === 'paid') {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);
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