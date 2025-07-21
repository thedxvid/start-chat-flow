import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendCredentialsRequest {
  email: string;
  fullName: string;
  tempPassword: string;
  role: string;
  planType: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, tempPassword, role, planType }: SendCredentialsRequest = await req.json();

    if (!email || !fullName || !tempPassword) {
      throw new Error("Dados obrigatórios não fornecidos");
    }

    const emailResponse = await resend.emails.send({
      from: "Sistema <onboarding@resend.dev>",
      to: [email],
      subject: "Suas credenciais de acesso ao sistema",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Bem-vindo ao sistema!</h1>
          
          <p>Olá <strong>${fullName}</strong>,</p>
          
          <p>Uma conta foi criada para você no nosso sistema. Aqui estão suas credenciais de acesso:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Senha temporária:</strong> <code style="background-color: #e0e0e0; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
            <p><strong>Função:</strong> ${role === 'admin' ? 'Administrador' : 'Usuário'}</p>
            <p><strong>Plano:</strong> ${planType === 'free' ? 'Gratuito' : planType === 'premium' ? 'Premium' : 'Pro'}</p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="color: #856404; margin-top: 0;">⚠️ Importante:</h3>
            <p style="color: #856404; margin-bottom: 0;">
              Por segurança, altere sua senha no primeiro acesso ao sistema. 
              Esta senha temporária expirará em 24 horas.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${Deno.env.get("SITE_URL") || "http://localhost:3000"}/auth" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Acessar o Sistema
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
            Se você não esperava receber este email, entre em contato conosco.
          </p>
        </div>
      `,
    });

    console.log("Email enviado com sucesso:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao enviar email:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
});