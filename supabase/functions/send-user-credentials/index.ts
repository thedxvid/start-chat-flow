import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendCredentialsRequest {
  email: string;
  fullName: string;
  tempPassword: string;
  role: string;
  planType: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, tempPassword, role, planType }: SendCredentialsRequest = await req.json();

    if (!email || !fullName || !tempPassword) {
      throw new Error("Dados obrigatórios não fornecidos");
    }

    // Criar cliente Supabase com privilégios de service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log("Criando usuário no sistema de autenticação:", email);

    // Criar o usuário diretamente no sistema de autenticação
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        full_name: fullName
      }
    });

    if (authError) {
      console.error("Erro ao criar usuário no auth:", authError);
      throw new Error(`Erro ao criar conta: ${authError.message}`);
    }

    console.log("Usuário criado com sucesso no auth:", authData.user.id);

    // Verificar se existe registro administrativo pendente e vincular
    try {
      const { data: adminRecord, error: adminError } = await supabaseAdmin
        .from('profiles')
        .select('id, temp_id')
        .eq('admin_email', email)
        .eq('is_admin_created', true)
        .is('user_id', null)
        .maybeSingle();

      if (adminRecord && !adminError) {
        console.log("Vinculando registro administrativo:", adminRecord.id);

        // Atualizar o perfil para vincular ao usuário real
        await supabaseAdmin
          .from('profiles')
          .update({ 
            user_id: authData.user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', adminRecord.id);

        // Atualizar user_roles
        await supabaseAdmin
          .from('user_roles')
          .update({ 
            user_id: authData.user.id,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', adminRecord.temp_id);

        // Atualizar subscriptions
        await supabaseAdmin
          .from('subscriptions')
          .update({ 
            user_id: authData.user.id,
            status: 'active',
            user_email_registered: email,
            registration_completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('customer_email', email)
          .is('user_id', null);

        console.log("Registro administrativo vinculado com sucesso");
      }
    } catch (linkError) {
      console.error("Erro ao vincular registro administrativo:", linkError);
      // Não falhar por causa disso, o usuário foi criado
    }

    // Enviar email com as credenciais
    const emailResponse = await resend.emails.send({
      from: "Sistema <noreply@sistemastart.com>",
      to: [email],
      subject: "Suas credenciais de acesso ao sistema",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Bem-vindo ao sistema!</h1>
          
          <p>Olá <strong>${fullName}</strong>,</p>
          
          <p>Uma conta foi criada para você no nosso sistema. Aqui estão suas credenciais de acesso:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Senha temporária:</strong> <code style="background-color: #e0e0e0; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
            <p><strong>Função:</strong> ${role === 'admin' ? 'Administrador' : 'Usuário'}</p>
            <p><strong>Plano:</strong> ${planType === 'free' ? 'Gratuito' : planType === 'premium' ? 'Premium' : 'Pro'}</p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="color: #856404; margin-top: 0;">⚠️ Importante:</h3>
            <p style="color: #856404; margin-bottom: 0;">
              Por segurança, altere sua senha no primeiro acesso ao sistema. 
              Você pode fazer login imediatamente com essas credenciais.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${Deno.env.get("SITE_URL") || "https://sistemastart.com"}/auth" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Acessar o Sistema
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
            Se você não esperava receber este email, entre em contato conosco.
          </p>
        </div>
      `,
    });

    console.log("Email enviado com sucesso:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: emailResponse.data?.id,
      userId: authData.user.id,
      message: "Usuário criado e email enviado com sucesso"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao criar usuário e enviar email:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
});