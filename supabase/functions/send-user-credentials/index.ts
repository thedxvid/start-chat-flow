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

// Chamada direta à API GoTrue admin via HTTP
async function gotrueAdmin(supabaseUrl: string, serviceKey: string, method: string, path: string, body?: Record<string, unknown>) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { data, status: res.status, ok: res.ok };
}

// Encontrar userId por email via generate_link + fallback paginado
async function findUserByEmail(supabaseUrl: string, serviceKey: string, email: string): Promise<string | null> {
  // Método 1: generate_link retorna o user
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'magiclink', email }),
    });
    if (res.ok) {
      const data = await res.json();
      const uid = data?.id || data?.user?.id;
      if (uid) return uid;
    } else {
      const t = await res.text();
      console.log("generate_link resp:", res.status, t);
    }
  } catch (e) {
    console.log("generate_link err:", e);
  }

  // Método 2: busca paginada via HTTP
  try {
    for (let page = 1; page <= 20; page++) {
      const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=500`, {
        headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey },
      });
      if (!res.ok) { await res.text(); break; }
      const data = await res.json();
      const users = data?.users || [];
      if (!Array.isArray(users) || users.length === 0) break;
      const found = users.find((u: Record<string, string>) => u.email?.toLowerCase() === email.toLowerCase());
      if (found) return found.id;
      if (users.length < 500) break;
    }
  } catch (e) {
    console.log("listUsers err:", e);
  }

  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, tempPassword, role, planType, mode }: SendCredentialsRequest = await req.json();
    console.log("🚀 v4 Processando:", email, "modo:", mode || 'create');

    if (!email || !fullName || !tempPassword) {
      return new Response(
        JSON.stringify({ error: 'Email, nome completo e senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

    if (!supabaseUrl || !serviceKey || !resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const loginUrl = 'https://sistemastart.com/auth';
    let userId: string | null = null;
    let userCreated = false;

    // ── Passo 1: Tentar criar via HTTP direto ──
    const createResult = await gotrueAdmin(supabaseUrl, serviceKey, 'POST', 'users', {
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createResult.ok && createResult.data?.id) {
      userId = createResult.data.id;
      userCreated = true;
      console.log("✅ Criado:", userId);
    } else {
      // Usuário já existe — buscar e atualizar
      console.log("⚠️ Create resp:", createResult.status, JSON.stringify(createResult.data).substring(0, 100));

      userId = await findUserByEmail(supabaseUrl, serviceKey, email);

      if (userId) {
        console.log("✅ Encontrado:", userId);
        const upd = await gotrueAdmin(supabaseUrl, serviceKey, 'PUT', `users/${userId}`, {
          password: tempPassword,
          email_confirm: true,
        });
        if (!upd.ok) {
          console.error("⚠️ Update resp:", upd.status, JSON.stringify(upd.data).substring(0, 100));
        } else {
          console.log("✅ Senha atualizada");
        }
      } else {
        console.error("⚠️ Não encontrou userId, mas email será enviado mesmo assim");
      }
    }

    // ── Passo 2: Profile/role/subscription para novos ──
    if (userCreated && userId) {
      const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      await supabaseAdmin.from('profiles').upsert({
        user_id: userId, full_name: fullName, email,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      }).catch((e: Error) => console.error("⚠️ profile:", e));

      await supabaseAdmin.from('user_roles').upsert({
        user_id: userId, role: role || 'user',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      }).catch((e: Error) => console.error("⚠️ role:", e));

      await supabaseAdmin.from('subscriptions').insert({
        user_id: userId, customer_email: email, customer_name: fullName,
        status: 'active', plan_type: planType || 'premium',
        access_code: 'ADMIN-CREATED',
        kiwify_order_id: 'ADMIN-' + Math.random().toString(36).substr(2, 12).toUpperCase(),
        expires_at: planType === 'free' ? null : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      }).catch((e: Error) => console.error("⚠️ subscription:", e));
    }

    // ── Passo 3: Enviar email SEMPRE ──
    const resend = new Resend(resendApiKey);
    const isReset = mode === 'reset' || !userCreated;

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
      console.error("⚠️ Resend erro:", emailResponse.error);
      return new Response(
        JSON.stringify({ success: true, userId, warning: 'Usuário processado mas email falhou' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("✅ Concluído:", email, userId);
    return new Response(
      JSON.stringify({ success: true, userId, emailId: emailResponse.data?.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("💥 Erro fatal:", error);
    return new Response(
      JSON.stringify({ error: 'Erro interno', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
