// Script para testar o envio de email
// Cole no console do navegador para testar

async function testEmailFunction() {
  try {
    console.log('Testando função de envio de email...');
    
    const response = await fetch('https://wpqthkvidfmjyroaijiq.supabase.co/functions/v1/send-user-credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('sb-wpqthkvidfmjyroaijiq-auth-token')?.match(/"access_token":"([^"]+)"/)?.[1]}`
      },
      body: JSON.stringify({
        email: 'eclipsestore7@gmail.com',
        fullName: 'Teste Davi',
        tempPassword: 'TEMP123456',
        role: 'admin',
        planType: 'premium'
      })
    });

    const result = await response.text();
    console.log('Status:', response.status);
    console.log('Resposta:', result);
    
    if (response.status === 200) {
      console.log('✅ Email enviado com sucesso!');
    } else {
      console.error('❌ Erro no envio:', result);
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
  }
}

// Execute a função
testEmailFunction();