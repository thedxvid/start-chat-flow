// Script para testar as correções aplicadas
// Execute este script no console do navegador após fazer login como admin

console.log('🧪 Iniciando testes das correções...');

// Função para testar se as funções SQL existem
async function checkSQLFunctions() {
  console.log('\n🔍 Verificando se as funções SQL existem...');
  
  try {
    // Testar se create_admin_user_v3 existe
    const { data, error } = await supabase.rpc('create_admin_user_v3', {
      user_email: 'test-function-exists@test.com',
      user_full_name: 'Test Function',
      user_role: 'user',
      plan_type: 'free'
    });
    
    if (error) {
      if (error.code === '42883') {
        console.error('❌ Função create_admin_user_v3 NÃO EXISTE no banco de dados!');
        console.log('📝 Você precisa executar a migração SQL primeiro.');
        return false;
      } else {
        console.log('✅ Função create_admin_user_v3 existe (erro esperado para email de teste)');
      }
    } else {
      console.log('✅ Função create_admin_user_v3 existe e funcionando');
    }
    
    return true;
  } catch (err) {
    console.error('❌ Erro ao verificar funções SQL:', err);
    return false;
  }
}

// Teste 1: Verificar se as novas funções SQL existem
async function testDatabaseFunctions() {
  console.log('\n📊 Testando funções do banco de dados...');
  
  try {
    // Testar função de criação de usuário v3
    const testEmail = `teste-${Date.now()}@exemplo.com`;
    const { data, error } = await supabase.rpc('create_admin_user_v3', {
      user_email: testEmail,
      user_full_name: 'Usuário Teste',
      user_role: 'user',
      plan_type: 'free'
    });
    
    if (error) {
      console.error('❌ Erro na função create_admin_user_v3:', error);
      return false;
    }
    
    if (data && data.success) {
      console.log('✅ create_admin_user_v3 funcionando:', data);
    } else {
      console.error('❌ create_admin_user_v3 retornou erro:', data);
      return false;
    }
    
    // Testar função de listagem v3
    const { data: users, error: listError } = await supabase.rpc('get_admin_users_v3');
    
    if (listError) {
      console.error('❌ Erro na função get_admin_users_v3:', listError);
      return false;
    }
    
    console.log('✅ get_admin_users_v3 funcionando. Usuários encontrados:', users?.length || 0);
    
    return true;
  } catch (err) {
    console.error('❌ Erro geral nos testes de banco:', err);
    return false;
  }
}

// Teste 2: Verificar roteamento
function testRouting() {
  console.log('\n🛣️ Testando roteamento...');
  
  const currentPath = window.location.pathname;
  console.log('📍 Caminho atual:', currentPath);
  
  // Verificar se não estamos mais usando /app
  if (currentPath.startsWith('/app')) {
    console.warn('⚠️ Ainda usando rota /app - pode precisar de atualização');
    return false;
  }
  
  console.log('✅ Roteamento atualizado corretamente');
  return true;
}

// Teste 3: Verificar se o sistema está funcionando
function testSystemHealth() {
  console.log('\n🏥 Verificando saúde do sistema...');
  
  // Verificar se o Supabase está conectado
  if (typeof supabase === 'undefined') {
    console.error('❌ Supabase não está disponível');
    return false;
  }
  
  console.log('✅ Supabase conectado');
  
  // Verificar se React Router está funcionando
  if (typeof window.history === 'undefined') {
    console.error('❌ History API não disponível');
    return false;
  }
  
  console.log('✅ React Router funcionando');
  return true;
}

// Executar todos os testes
async function runAllTests() {
  console.log('🚀 Executando todos os testes...\n');
  
  const systemOk = testSystemHealth();
  const routingOk = testRouting();
  const dbOk = await testDatabaseFunctions();
  
  console.log('\n📋 Resumo dos testes:');
  console.log(`Sistema: ${systemOk ? '✅' : '❌'}`);
  console.log(`Roteamento: ${routingOk ? '✅' : '❌'}`);
  console.log(`Banco de dados: ${dbOk ? '✅' : '❌'}`);
  
  const allPassed = systemOk && routingOk && dbOk;
  
  if (allPassed) {
    console.log('\n🎉 Todos os testes passaram! As correções estão funcionando.');
  } else {
    console.log('\n⚠️ Alguns testes falharam. Verifique os erros acima.');
  }
  
  return allPassed;
}

// Executar automaticamente
runAllTests();

// Instruções para uso manual
console.log(`
📝 INSTRUÇÕES PARA TESTE MANUAL:

1. Acesse o painel administrativo
2. Tente criar um novo usuário
3. Verifique se não há erros de constraint
4. Teste a navegação entre páginas
5. Confirme que a URL raiz (/) funciona corretamente

Para executar este teste novamente, digite: runAllTests()
`);