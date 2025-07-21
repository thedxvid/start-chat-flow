# Guia para Testar o Projeto Localmente

## 1. Pré-requisitos

Certifique-se de ter instalado:
- Node.js (versão 18 ou superior)
- npm ou yarn
- Supabase CLI (opcional, mas recomendado)

## 2. Configuração do Ambiente

### Instalar dependências
```bash
npm install
```

### Configurar variáveis de ambiente
Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```env
VITE_SUPABASE_URL=https://wpqthkvidfmjyroaijiq.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
```

## 3. Executar o Projeto

### Modo desenvolvimento
```bash
npm run dev
```

O projeto estará disponível em: http://localhost:5173

## 4. Testando as Correções SQL

### 4.1 Testar Criação de Usuário Administrativo

1. Acesse o painel administrativo do seu projeto
2. Tente criar um novo usuário usando a função corrigida
3. Verifique se o usuário é criado sem erros de constraint

### 4.2 Testar Vinculação de Registro

1. Crie um usuário administrativamente
2. Faça o registro normal com o mesmo email
3. Verifique se os registros são vinculados corretamente

### 4.3 Verificar no Banco de Dados

Execute estas queries no SQL Editor do Supabase para verificar:

```sql
-- Ver todos os usuários incluindo registros administrativos
SELECT * FROM get_admin_users_v2();

-- Ver profiles administrativos
SELECT * FROM profiles WHERE is_admin_created = TRUE;

-- Ver subscriptions pendentes
SELECT * FROM subscriptions WHERE status = 'pending';
```

## 5. Funcionalidades para Testar

### 5.1 Fluxo de Registro Normal
- [ ] Registro de novo usuário
- [ ] Login com credenciais
- [ ] Acesso ao dashboard

### 5.2 Fluxo Administrativo
- [ ] Criação de usuário pelo admin
- [ ] Listagem de usuários administrativos
- [ ] Vinculação quando usuário se registra

### 5.3 Gestão de Assinaturas
- [ ] Criação de assinatura
- [ ] Ativação de plano
- [ ] Verificação de status

## 6. Comandos Úteis

### Build para produção
```bash
npm run build
```

### Preview da build
```bash
npm run preview
```

### Lint do código
```bash
npm run lint
```

## 7. Estrutura de Testes

### Testar APIs
Use o console do navegador ou Postman para testar as funções:

```javascript
// Testar criação de usuário administrativo
const { data, error } = await supabase.rpc('create_admin_user_v2', {
  user_email: 'teste@exemplo.com',
  user_full_name: 'Usuário Teste',
  user_role: 'user',
  plan_type: 'premium'
});

console.log('Resultado:', data, error);
```

### Testar Listagem
```javascript
// Testar listagem de usuários
const { data, error } = await supabase.rpc('get_admin_users_v2');
console.log('Usuários:', data, error);
```

## 8. Troubleshooting

### Erro de CORS
Se encontrar erros de CORS, verifique as configurações do Supabase.

### Erro de Autenticação
Verifique se as chaves do Supabase estão corretas no arquivo `.env.local`.

### Erro de Banco de Dados
Confirme se todas as migrações SQL foram aplicadas corretamente.

## 9. Próximos Passos

Após os testes locais:
1. Testar em ambiente de staging
2. Fazer deploy para produção
3. Monitorar logs de erro
4. Validar com usuários reais