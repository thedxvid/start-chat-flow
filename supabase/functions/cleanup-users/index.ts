import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🧹 Iniciando função de limpeza...");

    const { action, email } = await req.json();

    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Variáveis de ambiente faltando");
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    if (action === 'cleanup_incomplete' && email) {
      console.log(`🔍 Limpando usuário específico: ${email}`);

      // Buscar usuário por email
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.error("❌ Erro ao listar usuários:", listError);
        return new Response(
          JSON.stringify({ error: 'Erro ao listar usuários' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userToClean = existingUsers.users.find(user => user.email === email);
      
      if (!userToClean) {
        console.log("⚠️ Usuário não encontrado:", email);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Usuário não encontrado - pode já ter sido removido' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`🗑️ Removendo usuário: ${email} (${userToClean.id})`);

      // Limpar dados relacionados primeiro
      try {
        const { error: cleanupError } = await supabaseAdmin.rpc('cleanup_incomplete_user', {
          user_email: email
        });
        
        if (cleanupError) {
          console.error("⚠️ Erro na limpeza SQL (não crítico):", cleanupError);
        }
      } catch (cleanupError) {
        console.error("⚠️ Erro na função de limpeza:", cleanupError);
      }

      // Remover usuário do auth
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userToClean.id);
      
      if (deleteError) {
        console.error("❌ Erro ao remover usuário:", deleteError);
        return new Response(
          JSON.stringify({ 
            error: `Erro ao remover usuário: ${deleteError.message}` 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log("✅ Usuário removido com sucesso");

      return new Response(
        JSON.stringify({
          success: true,
          message: `Usuário ${email} removido com sucesso`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limpeza geral de usuários incompletos
    console.log("🔍 Buscando usuários incompletos...");
    
    const { data: allUsers, error: listAllError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listAllError) {
      console.error("❌ Erro ao listar todos os usuários:", listAllError);
      return new Response(
        JSON.stringify({ error: 'Erro ao listar usuários' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanupResults = [];

    for (const authUser of allUsers.users) {
      // Verificar se tem profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();
      
      if (profileError && profileError.code === 'PGRST116') {
        // Não tem profile - dados incompletos
        console.log(`🔍 Usuário incompleto encontrado: ${authUser.email} (${authUser.id})`);
        
        try {
          // Limpar dados relacionados
          await supabaseAdmin.rpc('cleanup_incomplete_user', {
            user_email: authUser.email
          });
          
          // Remover do auth
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);
          
          if (!deleteError) {
            cleanupResults.push({
              email: authUser.email,
              id: authUser.id,
              status: 'removed'
            });
            console.log(`✅ Usuário incompleto removido: ${authUser.email}`);
          } else {
            console.error(`❌ Erro ao remover ${authUser.email}:`, deleteError);
            cleanupResults.push({
              email: authUser.email,
              id: authUser.id,
              status: 'error',
              error: deleteError.message
            });
          }
        } catch (cleanupError) {
          console.error(`❌ Erro na limpeza de ${authUser.email}:`, cleanupError);
          cleanupResults.push({
            email: authUser.email,
            id: authUser.id,
            status: 'error',
            error: cleanupError.message
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Limpeza concluída. ${cleanupResults.filter(r => r.status === 'removed').length} usuários incompletos removidos.`,
        details: cleanupResults
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("💥 Erro na função de limpeza:", error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno no servidor',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});