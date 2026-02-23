import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    from?: string;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (!resendApiKey) {
            return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const { to, subject, html, text, from }: EmailRequest = await req.json();

        const resend = new Resend(resendApiKey);
        const { data, error } = await resend.emails.send({
            from: from || 'Sistema Start <noreply@sistemastart.com>',
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
            text: text || "Por favor, veja a versão em HTML deste email.",
        });

        if (error) {
            console.error('Resend error:', error);
            return new Response(JSON.stringify({ error }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: true, data }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (err: any) {
        console.error('Unexpected error:', err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
