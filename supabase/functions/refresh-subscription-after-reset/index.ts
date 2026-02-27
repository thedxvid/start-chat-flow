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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Config incompleta' }), { status: 500, headers });
    }

    // Validate JWT - get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers });
    }

    // Use the user's token to get their identity
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': authHeader,
        'apikey': Deno.env.get('SUPABASE_ANON_KEY') || serviceKey,
      },
    });
    const userText = await userRes.text();
    if (!userRes.ok) {
      console.error('❌ Falha ao validar usuário:', userRes.status, userText.substring(0, 100));
      return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers });
    }

    let userData: { id?: string; email?: string } = {};
    try { userData = JSON.parse(userText); } catch (_e) { /* ignore */ }

    const userId = userData.id;
    const userEmail = userData.email;

    if (!userId || !userEmail) {
      return new Response(JSON.stringify({ error: 'Usuário não identificado' }), { status: 401, headers });
    }

    console.log('🔄 refresh-subscription-after-reset para:', userEmail, userId);

    const serviceHeaders = {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
    };

    // ── 1. Buscar TODAS as subscriptions por user_id ──
    const subByIdRes = await fetch(
      `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}&select=id,status,plan_type,expires_at,customer_email`,
      { headers: serviceHeaders }
    );
    const subByIdText = await subByIdRes.text();
    let subById: Array<{ id: string; status: string; plan_type: string; expires_at: string | null; customer_email: string }> = [];
    try { subById = JSON.parse(subByIdText); } catch (_e) { /* ignore */ }

    // ── 2. Buscar subscriptions legadas por email (sem user_id) ──
    const subByEmailRes = await fetch(
      `${supabaseUrl}/rest/v1/subscriptions?customer_email=eq.${encodeURIComponent(userEmail)}&user_id=is.null&select=id,status,plan_type,expires_at,customer_email`,
      { headers: serviceHeaders }
    );
    const subByEmailText = await subByEmailRes.text();
    let subByEmail: Array<{ id: string; status: string; plan_type: string; expires_at: string | null; customer_email: string }> = [];
    try { subByEmail = JSON.parse(subByEmailText); } catch (_e) { /* ignore */ }

    console.log(`📊 Subscriptions encontradas: ${subById.length} por user_id, ${subByEmail.length} legadas por email`);

    const allSubs = [...subById, ...subByEmail];
    const paidPlanTypes = ['premium', 'pro', 'vip'];

    // Identificar se o usuário já teve algum plano pago
    const hasPaidPlan = allSubs.some(s => paidPlanTypes.includes(s.plan_type?.toLowerCase()));

    if (!hasPaidPlan && allSubs.length === 0) {
      console.log('ℹ️ Nenhuma subscription encontrada para o usuário — não promover');
      return new Response(JSON.stringify({
        success: true, renewed: false, normalizedCount: 0,
        message: 'Nenhuma assinatura encontrada para renovar',
      }), { status: 200, headers });
    }

    const newExpires = new Date(Date.now() + 180 * 86400000).toISOString();
    let normalizedCount = 0;
    let renewedPlanType = '';

    // ── 3. Vincular registros legados ao user_id ──
    if (subByEmail.length > 0) {
      const legacyIds = subByEmail.map(s => s.id);
      for (const legacyId of legacyIds) {
        await fetch(`${supabaseUrl}/rest/v1/subscriptions?id=eq.${legacyId}`, {
          method: 'PATCH',
          headers: serviceHeaders,
          body: JSON.stringify({ user_id: userId }),
        }).then(r => r.text());
        normalizedCount++;
      }
      console.log(`✅ ${normalizedCount} registros legados vinculados ao user_id`);
    }

    // ── 4. Renovar TODAS as subscriptions pagas do usuário ──
    // Coletar todos os IDs relevantes (por user_id + legados já vinculados)
    const allIds = allSubs.map(s => s.id);

    if (hasPaidPlan) {
      // Encontrar o plano pago mais recente
      const paidSub = allSubs.find(s => paidPlanTypes.includes(s.plan_type?.toLowerCase()));
      renewedPlanType = paidSub?.plan_type || 'premium';

      // Atualizar TODAS as subscriptions desse usuário para ativo
      for (const subId of allIds) {
        await fetch(`${supabaseUrl}/rest/v1/subscriptions?id=eq.${subId}`, {
          method: 'PATCH',
          headers: serviceHeaders,
          body: JSON.stringify({
            status: 'active',
            expires_at: newExpires,
            user_id: userId,
          }),
        }).then(r => r.text());
      }
      console.log(`✅ ${allIds.length} subscriptions renovadas: plan=${renewedPlanType}, expires=${newExpires}`);
    } else if (allSubs.length > 0) {
      // Tem subscription mas não é paga — apenas garantir user_id vinculado, não renovar
      renewedPlanType = allSubs[0].plan_type || 'free';
      // Ainda assim atualizar status para active se existir
      for (const subId of allIds) {
        await fetch(`${supabaseUrl}/rest/v1/subscriptions?id=eq.${subId}`, {
          method: 'PATCH',
          headers: serviceHeaders,
          body: JSON.stringify({
            status: 'active',
            user_id: userId,
          }),
        }).then(r => r.text());
      }
      console.log(`✅ Subscriptions free atualizadas para active`);
    }

    return new Response(JSON.stringify({
      success: true,
      renewed: hasPaidPlan,
      normalizedCount,
      planType: renewedPlanType,
      expiresAt: hasPaidPlan ? newExpires : null,
      totalSubscriptions: allIds.length,
    }), { status: 200, headers });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('💥 refresh-subscription-after-reset erro fatal:', msg);
    return new Response(JSON.stringify({ error: 'Erro interno', details: msg }), { status: 500, headers });
  }
});
