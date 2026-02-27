
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResendCredentialsRequest {
    email: string;
    fullName?: string;
    planType?: string;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        console.log("🔄 [RESEND] Iniciando reenvio de credenciais...");

        let body: ResendCredentialsRequest;
        try {
            body = await req.json();
        } catch (e) {
            return new Response(
                JSON.stringify({ error: 'JSON inválido' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { email: rawEmail, fullName, planType } = body;

        if (!rawEmail) {
            return new Response(
                JSON.stringify({ error: 'Email é obrigatório' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const email = rawEmail.trim().toLowerCase();

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        const siteUrl = Deno.env.get('SITE_URL') || 'https://sistemastart.com';

        if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
            return new Response(
                JSON.stringify({ error: 'Configuração incompleta no servidor' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        console.log(`🔍 [RESEND] Buscando usuário: ${email}`);

        // Buscar o usuário existente
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

        if (listError) {
            console.error("❌ Erro ao listar usuários:", listError);
            return new Response(
                JSON.stringify({ error: 'Erro ao buscar usuários: ' + listError.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const existingUser = users?.find(u => u.email?.toLowerCase() === email);

        if (!existingUser) {
            console.log(`❌ [RESEND] Usuário não encontrado: ${email}`);
            return new Response(
                JSON.stringify({ error: `Usuário com email ${email} não encontrado no sistema.` }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`✅ [RESEND] Usuário encontrado: ${existingUser.id}`);

        // Buscar nome do profile se não fornecido
        let userName = fullName;
        if (!userName) {
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('full_name')
                .eq('user_id', existingUser.id)
                .maybeSingle();

            userName = profile?.full_name || existingUser.user_metadata?.full_name || email;
        }

        // Gerar nova senha temporária
        const generatePassword = () => {
            const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            let result = "START-";
            for (let i = 0; i < 8; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result + "!";
        };

        const newTempPassword = generatePassword();

        console.log(`🔑 [RESEND] Atualizando senha do usuário...`);

        // Atualizar a senha do usuário via admin API
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingUser.id,
            { password: newTempPassword }
        );

        if (updateError) {
            console.error("❌ [RESEND] Erro ao atualizar senha:", updateError);
            return new Response(
                JSON.stringify({ error: 'Erro ao atualizar senha: ' + updateError.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`📧 [RESEND] Enviando novas credenciais para ${email}`);

        const resend = new Resend(resendApiKey);
        const { error: emailError } = await resend.emails.send({
            from: 'Sistema Start <noreply@sistemastart.com>',
            to: [email],
            subject: '🔑 Suas novas credenciais de acesso — Sistema Start',
            html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Novas Credenciais — Sistema Start</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f0;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#c9a84c;border-radius:14px;padding:12px 24px;">
                    <span style="font-size:15px;font-weight:700;letter-spacing:0.5px;color:#ffffff;">Sistema Start</span>
                  </td>
                </tr>
              </table>
              <p style="margin:12px 0 0 0;font-size:12px;color:#8a8a8a;">by Nathalia Ouro</p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.06);">

              <!-- Top accent -->
              <tr><td style="height:4px;background-color:#c9a84c;display:block;line-height:4px;font-size:4px;">&nbsp;</td></tr>

              <!-- Body -->
              <tr>
                <td style="padding:48px;">

                  <!-- Icon -->
                  <div style="width:52px;height:52px;background-color:#faf5e9;border-radius:14px;text-align:center;line-height:52px;margin-bottom:28px;font-size:24px;">🔑</div>

                  <h1 style="margin:0 0 12px 0;font-size:26px;font-weight:700;letter-spacing:-0.5px;color:#1a1a1a;">Olá, ${userName}!</h1>

                  <p style="margin:0 0 32px 0;font-size:16px;color:#666666;line-height:1.6;">
                    Suas credenciais de acesso ao <strong style="color:#1a1a1a;">Sistema Start</strong> foram reenviadas. Use os dados abaixo para entrar na plataforma:
                  </p>

                  <!-- Credentials box -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                    <tr>
                      <td style="background-color:#faf5e9;border-radius:14px;padding:24px;">
                        <p style="margin:0 0 12px 0;font-size:13px;font-weight:700;color:#8a6a1a;text-transform:uppercase;letter-spacing:0.5px;">Suas credenciais</p>
                        <p style="margin:0 0 8px 0;font-size:15px;color:#1a1a1a;">
                          <strong>E-mail:</strong> ${email}
                        </p>
                        <p style="margin:0;font-size:15px;color:#1a1a1a;">
                          <strong>Nova senha:</strong> <code style="background:#fff;padding:4px 10px;border-radius:6px;border:1px solid #e5dcc8;font-size:14px;font-weight:700;color:#c9a84c;letter-spacing:1px;">${newTempPassword}</code>
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- CTA -->
                  <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                    <tr>
                      <td style="border-radius:12px;background-color:#c9a84c;">
                        <a href="${siteUrl}/auth"
                           style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">
                          Acessar Sistema Start &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Warning -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background-color:#fff8f0;border-left:3px solid #f59e0b;border-radius:0 8px 8px 0;padding:14px 18px;">
                        <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
                          ⚠️ Por segurança, recomendamos que você <strong>troque esta senha</strong> após o primeiro acesso em Configurações → Alterar Senha.
                        </p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
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
      </td>
    </tr>
  </table>

</body>
</html>`,
        });

        if (emailError) {
            console.warn("⚠️ [RESEND] Erro ao enviar email:", emailError);
            // Retornar sucesso mesmo com erro no email — senha já foi atualizada
            return new Response(
                JSON.stringify({
                    success: true,
                    warning: 'Senha atualizada, mas o email falhou ao ser enviado.',
                    newTempPassword,
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`✅ [RESEND] Credenciais reenviadas com sucesso para ${email}`);

        return new Response(
            JSON.stringify({ success: true, message: `Novas credenciais enviadas para ${email}` }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (err: any) {
        console.error("💥 [RESEND] Erro inesperado:", err);
        return new Response(
            JSON.stringify({ error: err.message || 'Erro interno do servidor' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
