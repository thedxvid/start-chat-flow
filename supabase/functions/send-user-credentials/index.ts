
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";
import { Resend } from "npm:resend@2.0.0";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Request interface
interface SendCredentialsRequest {
  email: string;
  fullName: string;
  tempPassword: string;
  role: string;
  planType: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Iniciando criação de usuário...");

    // Parse request
    const { email: rawEmail, fullName, tempPassword, role, planType }: SendCredentialsRequest = await req.json();
    const email = rawEmail.trim().toLowerCase();

    // Validate required fields
    if (!email || !fullName || !tempPassword) {
      return new Response(
        JSON.stringify({ error: 'Email, nome completo e senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const siteUrl = Deno.env.get('SITE_URL') || 'https://sistemastart.com';

    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      console.error("❌ Variáveis de ambiente faltando");
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log("🔍 Verificando se usuário já existe...");

    // Check if user already exists AND get user details
    const { data: existingUser, error: checkError } = await supabaseAdmin.auth.admin.listUsers();

    if (checkError) {
      console.error("❌ Erro ao verificar usuários existentes:", checkError);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar usuários existentes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userExists = existingUser.users.find(user => user.email === email);

    if (userExists) {
      console.log("⚠️ Usuário já existe:", email, "ID:", userExists.id);

      // Verificar se tem profile completo
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', userExists.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Usuário existe mas não tem profile - dados incompletos, vamos limpar e recriar
        console.log("🧹 Usuário existe mas com dados incompletos. Limpando...");

        try {
          // Limpar dados relacionados via função SQL
          const { error: cleanupError } = await supabaseAdmin.rpc('cleanup_incomplete_user', {
            user_email: email
          });

          if (cleanupError) {
            console.error("❌ Erro na limpeza SQL:", cleanupError);
          }

          // Remover usuário do auth
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userExists.id);
          if (deleteError) {
            console.error("❌ Erro ao remover usuário incompleto:", deleteError);
            return new Response(
              JSON.stringify({
                error: `Email já está em uso. Erro na limpeza: ${deleteError.message}`,
                suggestion: 'Use outro email ou contate o administrador'
              }),
              { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            console.log("✅ Usuário incompleto removido, prosseguindo com criação...");
          }
        } catch (cleanupError) {
          console.error("❌ Erro na limpeza:", cleanupError);
          return new Response(
            JSON.stringify({
              error: 'Email já está em uso. Erro na limpeza de dados. Contate o suporte.',
              suggestion: 'Use outro email ou contate o administrador'
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // Usuário existe e tem profile completo
        return new Response(
          JSON.stringify({
            error: 'Usuário já existe com este email e tem dados completos',
            suggestion: 'Use a função de redefinir senha ou escolha outro email'
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log("✅ Email disponível, criando usuário...");

    // Create user in auth
    const { data: authData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName
      }
    });

    if (createUserError) {
      console.error("❌ Erro ao criar usuário:", createUserError);
      return new Response(
        JSON.stringify({ error: `Erro ao criar usuário: ${createUserError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authData.user) {
      console.error("❌ Usuário não foi criado");
      return new Response(
        JSON.stringify({ error: 'Falha ao criar usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;
    console.log("✅ Usuário criado no auth:", userId);

    // Generate access code for subscription
    const accessCode = 'START-' + Math.random().toString(36).substr(2, 8).toUpperCase();

    // Create user profile (the trigger will also create one, but this ensures it has admin data)
    console.log("📝 Criando profile do usuário...");
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: userId,
        full_name: fullName,
        is_admin_created: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error("⚠️ Erro ao criar profile (não crítico):", profileError);
    } else {
      console.log("✅ Profile criado");
    }

    // Create user role
    console.log("👤 Criando role do usuário...");
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: role || 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (roleError) {
      console.error("⚠️ Erro ao criar role (não crítico):", roleError);
    } else {
      console.log("✅ Role criada");
    }

    // Create subscription
    console.log("💳 Criando subscription...");
    const { error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: userId,
        customer_email: email,
        customer_name: fullName,
        status: 'active',
        plan_type: planType || 'premium',
        access_code: accessCode,
        kiwify_order_id: 'ADMIN-' + Math.random().toString(36).substr(2, 12).toUpperCase(),
        expires_at: planType === 'free' ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (subscriptionError) {
      console.error("⚠️ Erro ao criar subscription (não crítico):", subscriptionError);
    } else {
      console.log("✅ Subscription criada");
    }

    // Send email with credentials
    console.log("📧 Enviando email com credenciais...");
    const resend = new Resend(resendApiKey);

    const emailResponse = await resend.emails.send({
      from: 'Sistema Start <noreply@sistemastart.com>',
      to: [email],
      subject: '🎉 Bem-vindo ao Sistema Start - Suas Credenciais de Acesso',
      text: `Olá ${fullName}!\n\nSua conta no Sistema Start foi criada com sucesso.\n\nSuas credenciais:\nEmail: ${email}\nSenha Temporária: ${tempPassword}\nPlano: ${planType || 'Premium'}\nCódigo de Acesso: ${accessCode}\n\nAcesse agora em: ${siteUrl}\n\nRecomendamos alterar sua senha no primeiro acesso.`,
      html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bem-vindo ao Sistema Start</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;color:#333333;">
  <div style="max-width:600px;margin:20px auto;background-color:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;text-align:center;color:#ffffff;">
      <h1 style="margin:0;font-size:24px;">🎉 Bem-vindo ao Sistema Start!</h1>
    </div>
    <div style="padding:30px;">
      <h2 style="margin:0 0 20px 0;font-size:18px;">👋 Olá, ${fullName}!</h2>
      <p style="margin-bottom:20px;line-height:1.6;">Sua conta foi criada com sucesso. Use as credenciais abaixo para acessar o sistema:</p>
      
      <div style="background-color:#f8f9fa;border:1px solid #e9ecef;border-radius:8px;padding:20px;margin-bottom:25px;">
        <p style="margin:0 0 10px 0;"><strong>📧 Email:</strong> ${email}</p>
        <p style="margin:0 0 10px 0;"><strong>🔑 Senha Temporária:</strong> <code style="background:#eee;padding:2px 5px;border-radius:3px;">${tempPassword}</code></p>
        <p style="margin:0 0 10px 0;"><strong>🎯 Plano:</strong> ${planType || 'Premium'}</p>
        <p style="margin:0;"><strong>🎫 Código de Acesso:</strong> <code style="background:#eee;padding:2px 5px;border-radius:3px;">${accessCode}</code></p>
      </div>

      <div style="text-align:center;margin:30px 0;">
        <a href="${siteUrl}" style="background:#667eea;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">🚀 Acessar Sistema agora</a>
      </div>

      <p style="font-size:13px;color:#777;margin-top:20px;border-top:1px solid #eee;padding-top:20px;">
        ⚠️ <strong>Importante:</strong> Recomendamos alterar sua senha no primeiro acesso para sua segurança.
      </p>
    </div>
    <div style="background-color:#333;color:#999;padding:15px;text-align:center;font-size:12px;">
      Este é um email automático do Sistema Start. Por favor, não responda.
    </div>
  </div>
</body>
</html>`,
    });

    if (emailResponse.error) {
      console.error("⚠️ Erro ao enviar email (usuário criado com sucesso):", emailResponse.error);
      // Usuário foi criado, mas email falhou
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Usuário criado com sucesso, mas falha no envio do email',
          userId: userId,
          warning: 'Email não enviado - verifique as credenciais manualmente'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("✅ Email enviado com sucesso:", emailResponse.data?.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Usuário criado e email enviado com sucesso',
        userId: userId,
        emailId: emailResponse.data?.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("💥 Erro não tratado:", error);
    return new Response(
      JSON.stringify({
        error: 'Erro interno no servidor',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
