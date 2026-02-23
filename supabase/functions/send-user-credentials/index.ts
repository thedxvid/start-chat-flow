
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendCredentialsRequest {
  email: string;
  fullName: string;
  tempPassword: string;
  role: string;
  planType: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 [INVOKE] Iniciando criação de usuário...");

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400, headers: corsHeaders });
    }

    const { email: rawEmail, fullName, tempPassword, role, planType }: SendCredentialsRequest = body;
    const email = rawEmail.trim().toLowerCase();

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const siteUrl = Deno.env.get('SITE_URL') || 'https://sistemastart.com';

    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      return new Response(JSON.stringify({ error: 'Configuração incompleta no servidor' }), { status: 500, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log(`🔍 [CHECK] Buscando usuário: ${email}`);

    // Usando listUsers que é o método mais compatível
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error("❌ Erro ao listar usuários:", listError);
    }

    const userExists = users?.find(u => u.email?.toLowerCase() === email);

    if (userExists) {
      console.log(`⚠️ [EXISTS] Usuário encontrado: ${userExists.id}`);

      // Verificar profile
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', userExists.id)
        .maybeSingle();

      if (!profile) {
        console.log("🧹 [CLEANUP] Profile não existe. Limpando usuário órfão...");
        await supabaseAdmin.rpc('cleanup_incomplete_user', { user_email: email });
        await supabaseAdmin.auth.admin.deleteUser(userExists.id);
        console.log("✅ Limpeza concluída.");
      } else {
        return new Response(
          JSON.stringify({ error: 'Este e-mail já possui uma conta ativa no sistema.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`🆕 [CREATE] Criando no Auth: ${email}`);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (authError) {
      console.error("❌ [AUTH_ERROR]:", authError.message);
      return new Response(JSON.stringify({ error: authError.message }), { status: 500, headers: corsHeaders });
    }

    const userId = authData.user.id;
    const accessCode = 'START-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    // Criar registros
    await supabaseAdmin.from('profiles').upsert({
      user_id: userId,
      full_name: fullName,
      is_admin_created: true,
      updated_at: new Date().toISOString()
    });

    await supabaseAdmin.from('user_roles').upsert({
      user_id: userId,
      role: role || 'user',
      updated_at: new Date().toISOString()
    });

    await supabaseAdmin.from('subscriptions').insert({
      user_id: userId,
      customer_email: email,
      customer_name: fullName,
      status: 'active',
      plan_type: planType || 'premium',
      access_code: accessCode,
      kiwify_order_id: 'ADMIN-' + Math.random().toString(36).substring(2, 14).toUpperCase(),
      expires_at: planType === 'free' ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    });

    console.log(`📧 [EMAIL] Enviando para ${email}`);
    const resend = new Resend(resendApiKey);
    const { error: emailError } = await resend.emails.send({
      from: 'Sistema Start <noreply@sistemastart.com>',
      to: [email],
      subject: '🚀 Seus dados de acesso ao Sistema Start',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #667eea;">Bem-vindo ao Sistema Start, ${fullName}!</h2>
          <p>Sua conta foi criada. Use os dados abaixo:</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>E-mail:</strong> ${email}</p>
            <p><strong>Senha:</strong> <code>${tempPassword}</code></p>
            <p><strong>Código de Acesso:</strong> <code>${accessCode}</code></p>
          </div>
          <p><a href="${siteUrl}/auth" style="display: inline-block; background: #667eea; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold;">Acessar Agora</a></p>
        </div>
      `
    });

    if (emailError) {
      console.warn("⚠️ [EMAIL_ERROR]:", emailError);
      return new Response(JSON.stringify({ success: true, warning: 'E-mail falhou', tempPassword, accessCode }), { status: 200, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, userId }), { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error("💥 [EXCEPTION]:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
