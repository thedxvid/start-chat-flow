
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SendCredentialsRequest {
  email: string;
  fullName: string;
  tempPassword: string;
  role: string;
  planType: string;
  mode?: 'create' | 'reset';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, tempPassword, role, planType, mode }: SendCredentialsRequest = await req.json();
    console.log("🚀 Processando:", email, "modo:", mode || 'create');

    if (!email || !fullName || !tempPassword) {
      return new Response(
        JSON.stringify({ error: 'Email, nome completo e senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const loginUrl = 'https://sistemastart.com/auth';

    let userId: string | null = null;
    let userCreated = false;

    // ── Passo 1: Tentar criar o usuário diretamente ──
    console.log("📝 Tentando criar usuário:", email);
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (!createError && createData?.user) {
      // Criação bem-sucedida
      userId = createData.user.id;
      userCreated = true;
      console.log("✅ Usuário criado:", userId);
    } else {
      // Usuário já existe - encontrar via generateLink (não envia email, só retorna dados)
      console.log("⚠️ Criação falhou:", createError?.message, "- buscando usuário existente...");

      try {
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
        });

        if (linkData?.user?.id) {
          userId = linkData.user.id;
          console.log("✅ Usuário encontrado via generateLink:", userId);
        } else {
          console.error("❌ generateLink falhou:", linkError?.message);
        }
      } catch (e) {
        console.error("❌ Erro no generateLink:", e);
      }

      // Se encontrou o userId, atualizar a senha
      if (userId) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: tempPassword,
          email_confirm: true
        });
        if (updateError) {
          console.error("❌ Erro ao atualizar senha:", updateError.message);
          return new Response(
            JSON.stringify({ error: `Erro ao redefinir senha: ${updateError.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.log("✅ Senha atualizada para:", email);
      } else {
        return new Response(
          JSON.stringify({ error: 'Não foi possível criar nem encontrar o usuário' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ── Passo 2: Garantir profile/role/subscription para novos usuários ──
    if (userCreated && userId) {
      await supabaseAdmin.from('profiles').upsert({
        user_id: userId, full_name: fullName, email,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      }).catch(e => console.error("⚠️ profile:", e));

      await supabaseAdmin.from('user_roles').upsert({
        user_id: userId, role: role || 'user',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      }).catch(e => console.error("⚠️ role:", e));

      await supabaseAdmin.from('subscriptions').insert({
        user_id: userId, customer_email: email, customer_name: fullName,
        status: 'active', plan_type: planType || 'premium',
        access_code: 'ADMIN-CREATED',
        kiwify_order_id: 'ADMIN-' + Math.random().toString(36).substr(2, 12).toUpperCase(),
        expires_at: planType === 'free' ? null : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      }).catch(e => console.error("⚠️ subscription:", e));
    }

    // ── Passo 3: Enviar email ──
    const resend = new Resend(resendApiKey);
    const isReset = mode === 'reset';

    const emailResponse = await resend.emails.send({
      from: 'Sistema Start <noreply@sistemastart.com>',
      to: [email],
      subject: isReset
        ? '🔑 Suas Novas Credenciais - Sistema Start'
        : '🎉 Bem-vindo ao Sistema Start - Suas Credenciais de Acesso',
      html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#333333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;text-align:center;border-radius:10px 10px 0 0;">
          <h1 style="margin:0;font-size:26px;color:#ffffff;">${isReset ? '🔑 Novas Credenciais' : '🎉 Bem-vindo ao Sistema Start!'}</h1>
          <p style="margin:10px 0 0 0;font-size:15px;color:#e8e8ff;">${isReset ? 'Suas credenciais foram atualizadas' : 'Sua conta foi criada com sucesso'}</p>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:30px;">
          <h2 style="margin:0 0 16px 0;color:#333333;font-size:20px;">👋 Olá, ${fullName}!</h2>
          <p style="color:#555555;line-height:1.7;margin-bottom:20px;font-size:15px;">
            ${isReset ? 'Suas credenciais de acesso foram atualizadas. Use os dados abaixo para entrar:' : 'Sua conta no Sistema Start foi criada com sucesso! Aqui estão suas credenciais de acesso:'}
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="background-color:#f8f9fa;border:2px solid #e9ecef;border-radius:8px;padding:20px;">
              <h3 style="margin:0 0 16px 0;color:#333333;font-size:16px;">🔐 Suas Credenciais:</h3>
              <p style="margin:0 0 10px 0;color:#444444;font-size:14px;"><strong>📧 Email:</strong> ${email}</p>
              <p style="margin:0 0 10px 0;color:#444444;font-size:14px;"><strong>🔑 Senha:</strong> <code style="background-color:#f1f3f4;padding:3px 8px;border-radius:4px;font-family:monospace;font-size:14px;">${tempPassword}</code></p>
              <p style="margin:0;color:#444444;font-size:14px;"><strong>🎯 Plano:</strong> ${planType || 'Premium'}</p>
            </td>
          </tr></table>
          <div style="text-align:center;margin:30px 0;">
            <a href="${loginUrl}" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;display:inline-block;">🚀 Acessar Sistema Start</a>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="background-color:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:15px 18px;">
              <h4 style="margin:0 0 10px 0;color:#7a5c00;font-size:14px;">⚠️ Importante:</h4>
              <ul style="margin:0;padding-left:18px;color:#7a5c00;font-size:13px;line-height:1.8;">
                <li>Use a aba <strong>"Entrar"</strong> para fazer login com email e senha acima.</li>
                <li>NÃO use a aba "Cadastrar" — sua conta já está criada.</li>
                <li>Recomendamos alterar a senha no primeiro acesso.</li>
              </ul>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="background-color:#333333;color:#cccccc;padding:20px;text-align:center;border-radius:0 0 10px 10px;">
          <p style="margin:0;font-size:13px;color:#cccccc;">📧 Este email foi enviado automaticamente pelo Sistema Start</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });

    if (emailResponse.error) {
      console.error("⚠️ Erro ao enviar email:", emailResponse.error);
      return new Response(
        JSON.stringify({ success: true, userId, warning: 'Email não enviado - verifique manualmente' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("✅ Concluído:", email, "userId:", userId);

    return new Response(
      JSON.stringify({ success: true, userId, emailId: emailResponse.data?.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("💥 Erro:", error);
    return new Response(
      JSON.stringify({ error: 'Erro interno no servidor', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
