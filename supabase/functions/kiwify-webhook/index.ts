import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KiwifyWebhookData {
  order_id: string;
  order_status: string;
  customer_email: string;
  product_id: string;
  product_name: string;
  created_at: string;
  updated_at: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify webhook signature (optional but recommended)
    // const signature = req.headers.get('x-kiwify-signature');
    // TODO: Implement signature verification when Kiwify provides it

    const webhookData: KiwifyWebhookData = await req.json();
    
    console.log('Received Kiwify webhook:', webhookData);

    // Find user by email
    const { data: userData, error: userError } = await supabaseClient.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error fetching users:', userError);
      throw userError;
    }

    const user = userData.users.find(u => u.email === webhookData.customer_email);
    
    if (!user) {
      console.log(`User not found for email: ${webhookData.customer_email}`);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Determine plan type and expiration based on product
    let planType = 'premium';
    let expiresAt = null;
    
    // Set expiration date (30 days from now for premium plans)
    if (webhookData.order_status === 'paid') {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);
      expiresAt = expirationDate.toISOString();
    }

    // Upsert subscription
    const { data: subscription, error: subscriptionError } = await supabaseClient
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        kiwify_order_id: webhookData.order_id,
        status: webhookData.order_status === 'paid' ? 'active' : 'pending',
        plan_type: planType,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'kiwify_order_id'
      });

    if (subscriptionError) {
      console.error('Error updating subscription:', subscriptionError);
      throw subscriptionError;
    }

    console.log('Subscription updated successfully:', subscription);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully',
        subscription 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});