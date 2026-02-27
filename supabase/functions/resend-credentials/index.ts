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

    console.log("🚀 resend-credentials v7 |", email, "| modo:", mode);

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

    // ── BLOCO 5b: Garantir subscription ativa para usuários existentes (modo reset) ──
    if (userId && !isNewUser) {
      try {
        const subRes = await fetch(`${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}&select=id,status,expires_at`, {
          headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey },
        });
        const subText = await subRes.text();
        let subData: Array<{ id: string; status: string; expires_at: string | null }> = [];
        try { subData = JSON.parse(subText); } catch (_e) { /* ignore */ }

        const newExpires = new Date(Date.now() + 180 * 86400000).toISOString();

        if (subData.length > 0) {
          const subId = subData[0].id;
          await fetch(`${supabaseUrl}/rest/v1/subscriptions?id=eq.${subId}`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ status: 'active', expires_at: newExpires }),
          }).then(r => r.text());
          console.log("✅ Subscription renovada para usuario existente:", userId, "expires:", newExpires);
        } else {
          await fetch(`${supabaseUrl}/rest/v1/subscriptions`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              user_id: userId, customer_email: email, customer_name: fullName,
              status: 'active', plan_type: planType,
              access_code: 'ADMIN-RESET',
              kiwify_order_id: 'ADMIN-RESET-' + Math.random().toString(36).substr(2, 12).toUpperCase(),
              expires_at: newExpires,
            }),
          }).then(r => r.text());
          console.log("✅ Nova subscription criada para usuario existente:", userId);
        }
      } catch (e) {
        console.log("⚠️ Erro ao renovar subscription (continuando):", e);
      }
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
          subject: isReset ? '🔑 Suas Novas Credenciais — Sistema Start' : '🎉 Bem-vindo ao Sistema Start',
          html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
</head>
<body style="margin:0;padding:0;background-color:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f5f5f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;">

        <!-- Logo -->
        <tr>
          <td align="center" style="padding-bottom:32px;">
            <table cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="background-color:#c9a84c;border-radius:14px;padding:12px 24px;">
                  <span style="font-size:15px;font-weight:700;letter-spacing:0.5px;color:#ffffff;">Sistema Start</span>
                </td>
              </tr>
            </table>
            <p style="margin:16px 0 0 0;font-size:12px;color:#8a8a8a;letter-spacing:0.3px;">by Nathalia Ouro</p>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.06);">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <!-- Gold accent bar -->
              <tr><td style="height:4px;background-color:#c9a84c;font-size:4px;line-height:4px;">&nbsp;</td></tr>

              <!-- Body -->
              <tr><td style="padding:48px 48px 16px 48px;">
                <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
                  <tr><td style="width:52px;height:52px;background-color:#faf5e9;border-radius:14px;text-align:center;vertical-align:middle;">
                    <span style="font-size:24px;line-height:52px;display:block;">${isReset ? '🔑' : '🎉'}</span>
                  </td></tr>
                </table>

                <h1 style="margin:0 0 12px 0;font-size:26px;font-weight:700;letter-spacing:-0.5px;color:#1a1a1a;line-height:1.2;">${isReset ? 'Suas Novas Credenciais' : 'Bem-vindo ao Sistema Start!'}</h1>
                <p style="margin:0 0 28px 0;font-size:16px;color:#666666;line-height:1.6;">
                  Olá, <strong style="color:#1a1a1a;">${fullName}</strong>!
                  ${isReset ? 'Suas credenciais foram atualizadas. Use os dados abaixo para acessar o sistema.' : 'Sua conta foi criada com sucesso. Use as credenciais abaixo para entrar.'}
                </p>

                <!-- Credentials box -->
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
                  <tr><td style="background-color:#faf5e9;border:1px solid #e8dcc0;border-radius:12px;padding:24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr><td style="padding-bottom:12px;">
                        <span style="font-size:13px;color:#8a6a1a;font-weight:600;">📧 E-mail</span><br/>
                        <span style="font-size:15px;color:#1a1a1a;font-weight:500;">${email}</span>
                      </td></tr>
                      <tr><td style="padding-bottom:12px;border-top:1px solid #e8dcc0;padding-top:12px;">
                        <span style="font-size:13px;color:#8a6a1a;font-weight:600;">🔑 Senha</span><br/>
                        <span style="font-family:monospace,'Courier New',monospace;font-size:18px;font-weight:700;color:#1a1a1a;letter-spacing:1px;">${tempPassword}</span>
                      </td></tr>
                      <tr><td style="border-top:1px solid #e8dcc0;padding-top:12px;">
                        <span style="font-size:13px;color:#8a6a1a;font-weight:600;">🎯 Plano</span><br/>
                        <span style="font-size:15px;color:#1a1a1a;font-weight:500;text-transform:capitalize;">${planType}</span>
                      </td></tr>
                    </table>
                  </td></tr>
                </table>

                <!-- CTA Button -->
                <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;" width="100%">
                  <tr><td align="center">
                    <a href="${loginUrl}" style="display:inline-block;padding:14px 40px;background-color:#c9a84c;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;letter-spacing:0.2px;">Acessar o Sistema &rarr;</a>
                  </td></tr>
                </table>
              </td></tr>

              <!-- Warning -->
              <tr><td style="padding:0 48px 40px 48px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr><td style="background-color:#faf5e9;border-radius:12px;padding:16px 20px;">
                    <p style="margin:0;font-size:13px;color:#8a6a1a;line-height:1.6;">
                      ⚠️ Use a aba <strong>"Entrar"</strong> na tela de login. NÃO clique em "Cadastrar".
                    </p>
                  </td></tr>
                </table>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:32px 0 0 0;text-align:center;">
            <p style="margin:0 0 6px 0;font-size:13px;color:#aaaaaa;">Sistema Start by Nathalia Ouro</p>
            <p style="margin:0;font-size:12px;color:#bbbbbb;">Este é um email automático. Por favor, não responda.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
        }),
      });
      const emailText = await emailRes.text();
      let emailData: Record<string, unknown> = {};
      try { emailData = JSON.parse(emailText); } catch (_e) { /* ignore */ }

      if (!emailRes.ok) {
        console.error("⚠️ Resend falhou:", emailRes.status, emailText.substring(0, 100));
        return new Response(JSON.stringify({ success: true, userId, warning: 'Email falhou mas credenciais atualizadas' }), { status: 200, headers });
      }

      console.log("✅ resend-credentials v8 OK:", email, userId, emailData.id);
      return new Response(JSON.stringify({ success: true, userId, emailId: emailData.id }), { status: 200, headers });
    } catch (e) {
      console.error("⚠️ Erro ao enviar email (retornando sucesso parcial):", e);
      return new Response(JSON.stringify({ success: true, userId, warning: 'Erro no envio do email' }), { status: 200, headers });
    }

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("💥 resend-credentials v7 erro fatal:", msg);
    return new Response(JSON.stringify({ error: 'Erro interno', details: msg }), { status: 500, headers });
  }
});
