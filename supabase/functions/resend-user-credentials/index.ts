const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch (_e) {
      return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400, headers });
    }

    const email = String(body.email || '').trim().toLowerCase();
    const fullName = String(body.fullName || '').trim() || 'Usuário';
    const planType = String(body.planType || 'premium').trim();

    console.log("🔄 resend-user-credentials v12 |", email);

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email é obrigatório' }), { status: 400, headers });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';

    if (!supabaseUrl || !serviceKey || !resendApiKey) {
      return new Response(JSON.stringify({ error: 'Configuração incompleta' }), { status: 500, headers });
    }

    const authHeaders = {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
    };

    // Buscar usuário existente via busca paginada
    let userId: string | null = null;
    let userName = fullName;

    try {
      for (let p = 1; p <= 10; p++) {
        const lRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${p}&per_page=500`, {
          headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey },
        });
        if (!lRes.ok) break;
        const lData = await lRes.json().catch(() => ({ users: [] }));
        const users = lData.users || [];
        if (users.length === 0) break;
        const match = users.find((u: any) => u.email?.toLowerCase() === email);
        if (match) {
          userId = match.id;
          userName = fullName || match.user_metadata?.full_name || email;
          break;
        }
        if (users.length < 500) break;
      }
    } catch (e) {
      console.log("⚠️ Erro ao buscar usuário:", e);
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: `Usuário ${email} não encontrado.` }), { status: 404, headers });
    }

    console.log(`✅ Usuário encontrado: ${userId}`);

    // Gerar nova senha
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let newPass = "START-";
    for (let i = 0; i < 8; i++) newPass += chars.charAt(Math.floor(Math.random() * chars.length));

    // Atualizar senha
    const upRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ password: newPass, email_confirm: true }),
    });
    const upText = await upRes.text();
    console.log("🔑 Senha atualizada:", upRes.status, upText.substring(0, 80));

    // Enviar email via Resend fetch
    const loginUrl = 'https://sistemastart.com/auth';
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Sistema Start <noreply@sistemastart.com>',
        to: [email],
        subject: '🔑 Suas novas credenciais de acesso — Sistema Start',
        html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;"><tr><td align="center">
<table width="560" style="max-width:560px;width:100%;">
<tr><td align="center" style="padding-bottom:32px;">
<span style="background:#c9a84c;border-radius:14px;padding:12px 24px;font-size:15px;font-weight:700;color:#fff;">Sistema Start</span>
</td></tr>
<tr><td style="background:#fff;border-radius:20px;padding:48px;box-shadow:0 2px 20px rgba(0,0,0,0.06);">
<h1 style="margin:0 0 12px;font-size:26px;color:#1a1a1a;">Olá, ${userName}!</h1>
<p style="font-size:16px;color:#666;line-height:1.6;">Suas credenciais foram atualizadas:</p>
<div style="background:#faf5e9;border-radius:12px;padding:24px;margin:24px 0;">
<p style="margin:0 0 8px;font-size:15px;"><strong>E-mail:</strong> ${email}</p>
<p style="margin:0;font-size:15px;"><strong>Nova senha:</strong> <code style="background:#fff;padding:4px 10px;border-radius:6px;border:1px solid #e5dcc8;font-size:14px;font-weight:700;color:#c9a84c;">${newPass}</code></p>
</div>
<a href="${loginUrl}" style="display:inline-block;padding:14px 32px;background:#c9a84c;color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;">Acessar Sistema Start →</a>
<p style="margin-top:24px;font-size:13px;color:#92400e;">⚠️ Recomendamos trocar a senha após o primeiro acesso.</p>
</td></tr>
<tr><td style="padding:32px 0;text-align:center;font-size:12px;color:#aaa;">Sistema Start by Nathalia Ouro</td></tr>
</table></td></tr></table></body></html>`,
      }),
    });
    const emailText = await emailRes.text();

    if (!emailRes.ok) {
      console.warn("⚠️ Email falhou:", emailRes.status, emailText.substring(0, 100));
      return new Response(JSON.stringify({ success: true, warning: 'Senha atualizada, mas email falhou.', newTempPassword: newPass }), { status: 200, headers });
    }

    console.log(`✅ resend-user-credentials v12 OK: ${email}`);
    return new Response(JSON.stringify({ success: true, message: `Novas credenciais enviadas para ${email}` }), { status: 200, headers });

  } catch (err: any) {
    console.error("💥 resend-user-credentials erro:", err);
    return new Response(JSON.stringify({ error: err.message || 'Erro interno' }), { status: 500, headers });
  }
});
