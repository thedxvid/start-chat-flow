

# Corrigir bloqueio de acesso premium ao redefinir senha

## Problema
Quando o admin redefine a senha de um usuário pelo painel, a Edge Function `send-user-credentials` atualiza apenas a senha do Supabase Auth, mas nao renova nem garante que a assinatura esteja ativa. Se o campo `expires_at` da assinatura expirou, o sistema bloqueia o acesso com "Acesso Premium Necessario".

## Causa raiz
- No arquivo `supabase/functions/send-user-credentials/index.ts`, o Bloco 5 (criacao de subscription) so executa para usuarios novos (`isNewUser === true`).
- Para usuarios existentes no modo `reset`, nenhuma verificacao ou atualizacao da subscription e feita.
- O `checkSubscriptionStatus` em `useAuthSimple.ts` verifica `status = 'active'` **e** `expires_at > agora`. Se expirou, o acesso e negado.

## Solucao

### 1. Atualizar Edge Function `send-user-credentials` (principal)
Adicionar um **Bloco 5b** apos o Bloco 4 (atualizacao de senha de usuario existente) que:
- Busca a subscription existente do usuario
- Se existir e estiver expirada ou inativa, atualiza `status` para `active` e renova `expires_at` para +180 dias
- Se nao existir, cria uma nova subscription com status `active`

Isso garante que toda vez que o admin reenvia credenciais, o acesso e restaurado automaticamente.

### 2. Aplicar mesma logica na Edge Function `resend-credentials`
Replicar a mesma verificacao/renovacao de subscription no `resend-credentials/index.ts` para consistencia.

## Detalhes tecnicos

No `send-user-credentials/index.ts`, entre o Bloco 4 e o Bloco 6, adicionar:

```text
// BLOCO 5b: Garantir subscription ativa para usuarios existentes (modo reset)
if (userId && !isNewUser) {
  // Buscar subscription existente
  const subRes = await fetch(supabaseUrl + '/rest/v1/subscriptions?user_id=eq.' + userId + '&select=id,status,expires_at', ...)
  // Se encontrou -> PATCH status=active, expires_at=+180 dias
  // Se nao encontrou -> POST nova subscription active
}
```

### Arquivos alterados
- `supabase/functions/send-user-credentials/index.ts` - Adicionar renovacao de subscription no reset
- `supabase/functions/resend-credentials/index.ts` - Mesma logica de renovacao

### Resultado esperado
Ao clicar em "Reenviar" no painel admin, alem de redefinir a senha e enviar o email, o sistema garante que a assinatura do usuario esteja ativa por mais 180 dias, eliminando o bloqueio de acesso premium.
