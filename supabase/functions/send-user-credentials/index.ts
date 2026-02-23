
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Request interface
interface SendCredentialsRequest {
  email: string;
  fullName: string;
  tempPassword: string;
  role: string;
  planType: string;
  mode?: 'create' | 'reset'; // 'reset' = apenas resetar senha de usuário existente
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Iniciando processamento...");

    // Parse request
    const { email, fullName, tempPassword, role, planType, mode }: SendCredentialsRequest = await req.json();

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

    const isReset = mode === 'reset';
    let userId: string;
    let accessCode = 'START-' + Math.random().toString(36).substr(2, 8).toUpperCase();

    if (isReset) {
      // ── MODO RESET: atualizar senha de usuário existente ──
      console.log("🔄 Modo RESET - Atualizando senha do usuário:", email);

      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar usuários' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (!existingUser) {
        return new Response(
          JSON.stringify({ error: `Usuário ${email} não encontrado no sistema` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = existingUser.id;

      // Atualizar senha via admin API
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUser(userId, {
        password: tempPassword,
        email_confirm: true
      });

      if (updateError) {
        console.error("❌ Erro ao atualizar senha:", updateError);
        return new Response(
          JSON.stringify({ error: `Erro ao redefinir senha: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log("✅ Senha atualizada com sucesso para:", email);

    } else {
      // ── MODO CREATE: criar novo usuário ──
      console.log("🔍 Verificando se usuário já existe...");

      const { data: existingUser, error: checkError } = await supabaseAdmin.auth.admin.listUsers();

      if (checkError) {
        console.error("❌ Erro ao verificar usuários existentes:", checkError);
        return new Response(
          JSON.stringify({ error: 'Erro ao verificar usuários existentes' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userExists = existingUser.users.find(user => user.email?.toLowerCase() === email.toLowerCase());

      if (userExists) {
        console.log("⚠️ Usuário já existe:", email, "ID:", userExists.id);

        const { data: profileData, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('user_id', userExists.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          console.log("🧹 Usuário existe mas com dados incompletos. Limpando...");
          try {
            const { error: cleanupError } = await supabaseAdmin.rpc('cleanup_incomplete_user', {
              user_email: email
            });
            if (cleanupError) {
              console.error("❌ Erro na limpeza SQL:", cleanupError);
            }
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userExists.id);
            if (deleteError) {
              return new Response(
                JSON.stringify({ error: `Email já está em uso. Erro na limpeza: ${deleteError.message}` }),
                { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          } catch (cleanupError) {
            return new Response(
              JSON.stringify({ error: 'Email já está em uso. Erro na limpeza de dados.' }),
              { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          return new Response(
            JSON.stringify({
              error: 'Usuário já existe com este email e tem dados completos',
              suggestion: 'Use a função "Reenviar Acesso" para redefinir a senha'
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      console.log("✅ Email disponível, criando usuário...");

      const { data: authData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });

      if (createUserError) {
        console.error("❌ Erro ao criar usuário:", createUserError);
        return new Response(
          JSON.stringify({ error: `Erro ao criar usuário: ${createUserError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!authData.user) {
        return new Response(
          JSON.stringify({ error: 'Falha ao criar usuário' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = authData.user.id;
      console.log("✅ Usuário criado no auth:", userId);

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          user_id: userId,
          full_name: fullName,
          email: email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      if (profileError) console.error("⚠️ Erro ao criar profile:", profileError);

      // Create role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: role || 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      if (roleError) console.error("⚠️ Erro ao criar role:", roleError);

      // Create subscription
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
      if (subscriptionError) console.error("⚠️ Erro ao criar subscription:", subscriptionError);
    }

    // ── Enviar email com credenciais ──
    console.log("📧 Enviando email com credenciais...");
    const resend = new Resend(resendApiKey);

    const emailSubject = isReset
      ? '🔑 Suas Novas Credenciais - Sistema Start'
      : '🎉 Bem-vindo ao Sistema Start - Suas Credenciais de Acesso';

    const emailResponse = await resend.emails.send({
      from: 'Sistema Start <noreply@sistemastart.com>',
      to: [email],
      subject: emailSubject,
      html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#333333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;text-align:center;border-radius:10px 10px 0 0;">
              <h1 style="margin:0;font-size:26px;color:#ffffff;">${isReset ? '🔑 Novas Credenciais' : '🎉 Bem-vindo ao Sistema Start!'}</h1>
              <p style="margin:10px 0 0 0;font-size:15px;color:#e8e8ff;">${isReset ? 'Suas credenciais foram atualizadas' : 'Sua conta foi criada com sucesso'}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:30px;">
              <h2 style="margin:0 0 16px 0;color:#333333;font-size:20px;">👋 Olá, ${fullName}!</h2>
              <p style="color:#555555;line-height:1.7;margin-bottom:20px;font-size:15px;">
                ${isReset ? 'Suas credenciais de acesso foram atualizadas. Use os dados abaixo para entrar:' : 'Sua conta no Sistema Start foi criada com sucesso! Aqui estão suas credenciais de acesso:'}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#f8f9fa;border:2px solid #e9ecef;border-radius:8px;padding:20px;">
                    <h3 style="margin:0 0 16px 0;color:#333333;font-size:16px;">🔐 Suas Credenciais:</h3>
                    <p style="margin:0 0 10px 0;color:#444444;font-size:14px;">
                      <strong>📧 Email:</strong> <span>${email}</span>
                    </p>
                    <p style="margin:0 0 10px 0;color:#444444;font-size:14px;">
                      <strong>🔑 Senha:</strong> <code style="background-color:#f1f3f4;padding:3px 8px;border-radius:4px;font-family:monospace;font-size:14px;">${tempPassword}</code>
                    </p>
                    <p style="margin:0;color:#444444;font-size:14px;">
                      <strong>🎯 Plano:</strong> <span>${planType || 'Premium'}</span>
                    </p>
                  </td>
                </tr>
              </table>
              <div style="text-align:center;margin:30px 0;">
                <a href="${siteUrl}/auth" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;display:inline-block;">🚀 Acessar Sistema Start</a>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:15px 18px;">
                    <h4 style="margin:0 0 10px 0;color:#7a5c00;font-size:14px;">⚠️ Importante:</h4>
                    <ul style="margin:0;padding-left:18px;color:#7a5c00;font-size:13px;line-height:1.8;">
                      <li>Use a aba <strong>"Entrar"</strong> para fazer login com email e senha acima.</li>
                      <li>NÃO use a aba "Cadastrar" — sua conta já está criada.</li>
                      <li>Recomendamos alterar a senha no primeiro acesso.</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#333333;color:#cccccc;padding:20px;text-align:center;border-radius:0 0 10px 10px;">
              <p style="margin:0;font-size:13px;color:#cccccc;">📧 Este email foi enviado automaticamente pelo Sistema Start</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    });

    if (emailResponse.error) {
      console.error("⚠️ Erro ao enviar email:", emailResponse.error);
      return new Response(
        JSON.stringify({
          success: true,
          userId,
          warning: 'Email não enviado - verifique as credenciais manualmente'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("✅ Email enviado com sucesso:", emailResponse.data?.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: isReset ? 'Senha redefinida e email enviado' : 'Usuário criado e email enviado com sucesso',
        userId,
        emailId: emailResponse.data?.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("💥 Erro não tratado:", error);
    return new Response(
      JSON.stringify({ error: 'Erro interno no servidor', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
