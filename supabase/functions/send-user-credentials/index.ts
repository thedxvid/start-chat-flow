
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

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("🚀 Iniciando função send-user-credentials");

  try {
    const requestBody = await req.json();
    console.log("📝 Dados recebidos:", { 
      email: requestBody.email, 
      fullName: requestBody.fullName, 
      role: requestBody.role, 
      planType: requestBody.planType 
    });

    const { email, fullName, tempPassword, role, planType }: SendCredentialsRequest = requestBody;

    if (!email || !fullName || !tempPassword) {
      console.error("❌ Dados obrigatórios faltando:", { email: !!email, fullName: !!fullName, tempPassword: !!tempPassword });
      throw new Error("Dados obrigatórios não fornecidos");
    }

    // Validar variáveis de ambiente
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const siteUrl = Deno.env.get("SITE_URL");

    console.log("🔍 Verificando variáveis de ambiente:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasResendKey: !!resendApiKey,
      hasSiteUrl: !!siteUrl,
      supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 20) + "..." : "undefined"
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Variáveis críticas do Supabase faltando");
      throw new Error("Configuração do Supabase incompleta");
    }

    if (!resendApiKey) {
      console.error("❌ RESEND_API_KEY não configurada");
      throw new Error("Configuração do Resend incompleta");
    }

    // Criar cliente Supabase com privilégios de service role
    console.log("🔧 Criando cliente Supabase...");
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log("👤 Verificando se usuário já existe no auth.users...");
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("❌ Erro ao listar usuários:", listError);
      throw new Error(`Erro ao verificar usuários existentes: ${listError.message}`);
    }

    const userExists = existingUsers?.users?.find((u: any) => u.email === email);
    if (userExists) {
      console.error("❌ Usuário já existe:", email);
      throw new Error(`Email ${email} já está registrado no sistema`);
    }

    console.log("✅ Email disponível, criando usuário no auth...");

    // Criar o usuário diretamente no sistema de autenticação
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName
      }
    });

    if (authError) {
      console.error("❌ Erro ao criar usuário no auth:", authError);
      throw new Error(`Erro ao criar conta no sistema de autenticação: ${authError.message}`);
    }

    if (!authData.user) {
      console.error("❌ Usuário criado mas sem dados retornados");
      throw new Error("Usuário criado mas dados não retornados");
    }

    console.log("✅ Usuário criado com sucesso no auth:", authData.user.id);

    // Tentar vincular registro administrativo se existir
    try {
      console.log("🔗 Verificando registros administrativos pendentes...");
      const { data: adminRecord, error: adminError } = await supabaseAdmin
        .from('profiles')
        .select('id, temp_id')
        .eq('admin_email', email)
        .eq('is_admin_created', true)
        .is('user_id', null)
        .maybeSingle();

      if (adminError) {
        console.error("⚠️ Erro ao verificar registro admin:", adminError);
      } else if (adminRecord) {
        console.log("🔗 Vinculando registro administrativo:", adminRecord.id);

        // Atualizar o perfil para vincular ao usuário real
        const { error: updateProfileError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            user_id: authData.user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', adminRecord.id);

        if (updateProfileError) {
          console.error("⚠️ Erro ao atualizar perfil:", updateProfileError);
        } else {
          console.log("✅ Perfil vinculado com sucesso");
        }

        // Atualizar user_roles
        const { error: updateRolesError } = await supabaseAdmin
          .from('user_roles')
          .update({ 
            user_id: authData.user.id,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', adminRecord.temp_id);

        if (updateRolesError) {
          console.error("⚠️ Erro ao atualizar roles:", updateRolesError);
        } else {
          console.log("✅ Roles vinculadas com sucesso");
        }

        // Atualizar subscriptions
        const { error: updateSubError } = await supabaseAdmin
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

        if (updateSubError) {
          console.error("⚠️ Erro ao atualizar assinatura:", updateSubError);
        } else {
          console.log("✅ Assinatura vinculada com sucesso");
        }
      } else {
        console.log("ℹ️ Nenhum registro administrativo pendente encontrado");
      }
    } catch (linkError) {
      console.error("⚠️ Erro ao vincular registro administrativo:", linkError);
      // Não falhar por causa disso, o usuário foi criado
    }

    // Inicializar Resend com verificação
    console.log("📧 Inicializando Resend...");
    let resend;
    try {
      resend = new Resend(resendApiKey);
      console.log("✅ Resend inicializado com sucesso");
    } catch (resendInitError) {
      console.error("❌ Erro ao inicializar Resend:", resendInitError);
      throw new Error(`Erro ao inicializar serviço de email: ${resendInitError.message}`);
    }

    // Enviar email com as credenciais
    console.log("📤 Enviando email para:", email);
    
    try {
      const emailResponse = await resend.emails.send({
        from: "Sistema <onboarding@resend.dev>",
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
              <a href="${siteUrl || "https://your-domain.com"}/auth" 
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

      if (emailResponse.error) {
        console.error("❌ Erro do Resend:", emailResponse.error);
        throw new Error(`Erro ao enviar email: ${emailResponse.error.message}`);
      }

      console.log("✅ Email enviado com sucesso:", emailResponse.data?.id);

      const successResponse = {
        success: true,
        messageId: emailResponse.data?.id,
        userId: authData.user.id,
        message: "Usuário criado e email enviado com sucesso",
        tempPassword: tempPassword // Incluir para debug
      };

      console.log("🎉 Processo concluído com sucesso:", successResponse);

      return new Response(JSON.stringify(successResponse), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });

    } catch (emailError: any) {
      console.error("❌ Erro específico no envio de email:", emailError);
      
      // Mesmo se o email falhar, o usuário foi criado
      return new Response(JSON.stringify({
        success: true,
        userId: authData.user.id,
        message: "Usuário criado com sucesso, mas houve erro no envio do email",
        emailError: emailError.message,
        tempPassword: tempPassword
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

  } catch (error: any) {
    console.error("💥 Erro geral na função:", {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    });

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
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
