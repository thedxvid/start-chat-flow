

# Plano: Corrigir Reenvio de Credenciais para Usuarios Ja Cadastrados

## Problema Raiz

O erro `"A user with this email address has already been registered"` continua ocorrendo porque as versoes anteriores da Edge Function nao foram implantadas corretamente no Supabase. O codigo no repositorio ja trata usuarios existentes, mas a versao que esta rodando no servidor e uma versao antiga que falha quando o usuario ja existe.

## Solucao

Reescrever **ambas** as Edge Functions (`send-user-credentials` e `resend-credentials`) com codigo identico e robusto, garantindo que:

1. A tentativa de criar usuario que ja existe **nunca** cause erro 500
2. Para usuarios existentes, busque o ID e atualize a senha
3. O email via Resend seja **sempre** disparado no final

Alem disso, verificar se o frontend esta chamando a funcao correta.

## Mudancas Tecnicas

### 1. `supabase/functions/resend-credentials/index.ts` (Reescrita Principal)

A funcao sera reescrita com a seguinte logica simplificada e resiliente:

```text
FLUXO:
  1. Recebe: email, fullName, tempPassword, role, planType, mode
  2. Tenta criar usuario via POST /auth/v1/admin/users
     - Se OK -> userId = resposta.id, isNewUser = true
     - Se ERRO (422/already registered) -> NAO FALHA, continua
  3. Se usuario ja existe:
     a. Busca userId via POST /auth/v1/admin/generate_link (magiclink)
     b. Se nao encontrou, busca paginada em /auth/v1/admin/users
  4. Se encontrou userId -> Atualiza senha via PUT /auth/v1/admin/users/{id}
  5. Se isNewUser -> Cria profile, role, subscription
  6. SEMPRE envia email via Resend API com as credenciais
  7. Retorna { success: true }
```

Diferenca critica em relacao as versoes anteriores: cada bloco tera try/catch individual para que nenhum erro intermediario interrompa o fluxo antes do envio do email.

### 2. `supabase/functions/send-user-credentials/index.ts` (Espelho)

Recebera o mesmo codigo da `resend-credentials` para garantir que ambos os endpoints funcionem, independente de qual o frontend chamar.

### 3. `src/hooks/useAdmin.ts` (Verificacao)

O frontend ja esta chamando `resend-credentials` (confirmado na linha 468). Nenhuma mudanca necessaria aqui a menos que haja erro de parsing na resposta. Sera adicionado um log extra para ajudar na depuracao caso o problema persista.

### 4. Verificacao de Deploy

Sera adicionado um identificador de versao no log da funcao (`v7`) para confirmar que a nova versao esta ativa. Ao testar, o log do Supabase deve mostrar `resend-credentials v7` -- se mostrar versao anterior, significa que o deploy nao ocorreu.

## Resumo das Alteracoes

| Arquivo | Acao |
|---|---|
| `supabase/functions/resend-credentials/index.ts` | Reescrita com try/catch individual por bloco |
| `supabase/functions/send-user-credentials/index.ts` | Espelho da resend-credentials |
| `src/hooks/useAdmin.ts` | Pequeno ajuste de log para debug |

