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
    const body = await req.json();
    const email: string = body.email;
    const fullName: string = body.fullName;
    const tempPassword: string = body.tempPassword;
    const role: string = body.role || 'user';
    const planType: string = body.planType || 'premium';
    const mode: string = body.mode || 'create';

    console.log("🚀 send-user-credentials v7 |", email, "| modo:", mode);

    if (!email || !fullName || !tempPassword) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios faltando' }), { status: 400, headers });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';

    if (!supabaseUrl || !serviceKey || !resendApiKey) {
      return new Response(JSON.stringify({ error: 'Config incompleta' }), { status: 500, headers });
    }

    const authHeaders = {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
    };

    let userId: string | null = null;
    let isNewUser = false;

    // ── BLOCO 1: Tentar criar usuário ──
    try {
      const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        }),
      });
      const createText = await createRes.text();
      let createData: Record<string, unknown> = {};
      try { createData = JSON.parse(createText); } catch (_e) { /* ignore */ }

      if (createRes.ok && createData.id) {
        userId = createData.id as string;
        isNewUser = true;
        console.log("✅ Novo usuário criado:", userId);
      } else {
        console.log("ℹ️ Criação falhou (esperado se já existe):", createRes.status, createText.substring(0, 120));
      }
    } catch (e) {
      console.log("⚠️ Erro no bloco criar usuário (continuando):", e);
    }

    // ── BLOCO 2: Buscar userId se não foi criado ──
    if (!userId) {
      try {
        const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ type: 'magiclink', email }),
        });
        const linkText = await linkRes.text();
        let linkData: Record<string, unknown> = {};
        try { linkData = JSON.parse(linkText); } catch (_e) { /* ignore */ }

        if (linkRes.ok) {
          userId = (linkData.id || (linkData.user as Record<string, unknown>)?.id || null) as string | null;
          if (userId) console.log("✅ Encontrado via generate_link:", userId);
        }
      } catch (e) {
        console.log("⚠️ Erro no bloco generate_link (continuando):", e);
      }
    }

    // ── BLOCO 3: Fallback busca paginada ──
    if (!userId) {
      try {
        for (let p = 1; p <= 10; p++) {
          const lRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${p}&per_page=500`, {
            headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey },
          });
          const lText = await lRes.text();
          if (!lRes.ok) break;
          let lData: { users?: Array<{ id: string; email?: string }> } = { users: [] };
          try { lData = JSON.parse(lText); } catch (_e) { /* ignore */ }
          const users = lData.users || [];
          if (users.length === 0) break;
          const match = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
          if (match) { userId = match.id; console.log("✅ Encontrado via busca paginada:", userId); break; }
          if (users.length < 500) break;
        }
      } catch (e) {
        console.log("⚠️ Erro no bloco busca paginada (continuando):", e);
      }
    }

    // ── BLOCO 4: Atualizar senha do usuário existente ──
    if (userId && !isNewUser) {
      try {
        const upRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({ password: tempPassword, email_confirm: true }),
        });
        const upText = await upRes.text();
        console.log("✅ Senha atualizada:", upRes.status, upText.substring(0, 80));
      } catch (e) {
        console.log("⚠️ Erro ao atualizar senha (continuando):", e);
      }
    }

    if (!userId) {
      console.log("⚠️ userId não encontrado — email será enviado mesmo assim");
    }

    // ── BLOCO 5: Criar registros auxiliares para novos usuários ──
    if (isNewUser && userId) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/profiles`, {
          method: 'POST',
          headers: { ...authHeaders, 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify({ user_id: userId, full_name: fullName, email }),
        }).then(r => r.text());
      } catch (e) { console.log("⚠️ Erro ao criar profile:", e); }

      try {
        await fetch(`${supabaseUrl}/rest/v1/user_roles`, {
          method: 'POST',
          headers: { ...authHeaders, 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify({ user_id: userId, role }),
        }).then(r => r.text());
      } catch (e) { console.log("⚠️ Erro ao criar role:", e); }

      try {
        await fetch(`${supabaseUrl}/rest/v1/subscriptions`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            user_id: userId, customer_email: email, customer_name: fullName,
            status: 'active', plan_type: planType,
            access_code: 'ADMIN-CREATED',
            kiwify_order_id: 'ADMIN-' + Math.random().toString(36).substr(2, 12).toUpperCase(),
            expires_at: planType === 'free' ? null : new Date(Date.now() + 180 * 86400000).toISOString(),
          }),
        }).then(r => r.text());
      } catch (e) { console.log("⚠️ Erro ao criar subscription:", e); }
    }

    // ── BLOCO 6: SEMPRE enviar email via Resend ──
    const isReset = mode === 'reset' || !isNewUser;
    const loginUrl = 'https://sistemastart.com/auth';

    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Sistema Start <noreply@sistemastart.com>',
          to: [email],
          subject: isReset ? '🔑 Suas Novas Credenciais - Sistema Start' : '🎉 Bem-vindo ao Sistema Start',
          html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;color:#333;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;"><tr><td align="center">
<table width="600" style="max-width:600px;width:100%;">
<tr><td style="background:linear-gradient(135deg,#667eea,#764ba2);padding:30px;text-align:center;border-radius:10px 10px 0 0;">
<h1 style="margin:0;font-size:26px;color:#fff;">${isReset ? '🔑 Novas Credenciais' : '🎉 Bem-vindo!'}</h1></td></tr>
<tr><td style="background:#fff;padding:30px;">
<h2 style="color:#333;">👋 Olá, ${fullName}!</h2>
<p style="color:#555;line-height:1.7;">${isReset ? 'Suas credenciais foram atualizadas:' : 'Sua conta foi criada! Credenciais:'}</p>
<div style="background:#f8f9fa;border:2px solid #e9ecef;border-radius:8px;padding:20px;margin:16px 0;">
<p style="margin:0 0 8px;"><strong>📧 Email:</strong> ${email}</p>
<p style="margin:0 0 8px;"><strong>🔑 Senha:</strong> <code style="background:#f1f3f4;padding:3px 8px;border-radius:4px;">${tempPassword}</code></p>
<p style="margin:0;"><strong>🎯 Plano:</strong> ${planType}</p></div>
<div style="text-align:center;margin:24px 0;">
<a href="${loginUrl}" style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">🚀 Acessar</a></div>
<div style="background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:15px;">
<p style="margin:0;color:#7a5c00;font-size:13px;">⚠️ Use a aba <strong>"Entrar"</strong>. NÃO use "Cadastrar".</p></div>
</td></tr></table></td></tr></table></body></html>`,
        }),
      });
      const emailText = await emailRes.text();
      let emailData: Record<string, unknown> = {};
      try { emailData = JSON.parse(emailText); } catch (_e) { /* ignore */ }

      if (!emailRes.ok) {
        console.error("⚠️ Resend falhou:", emailRes.status, emailText.substring(0, 100));
        return new Response(JSON.stringify({ success: true, userId, warning: 'Email falhou mas credenciais atualizadas' }), { status: 200, headers });
      }

      console.log("✅ send-user-credentials v7 OK:", email, userId, emailData.id);
      return new Response(JSON.stringify({ success: true, userId, emailId: emailData.id }), { status: 200, headers });
    } catch (e) {
      console.error("⚠️ Erro ao enviar email (retornando sucesso parcial):", e);
      return new Response(JSON.stringify({ success: true, userId, warning: 'Erro no envio do email' }), { status: 200, headers });
    }

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("💥 send-user-credentials v7 erro fatal:", msg);
    return new Response(JSON.stringify({ error: 'Erro interno', details: msg }), { status: 500, headers });
  }
});
