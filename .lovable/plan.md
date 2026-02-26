

# Corrigir Criacao de Usuarios no Painel Admin

## Problemas Identificados

### Problema 1: Edge Function retornando 500
A screenshot mostra que a Edge Function `send-user-credentials` retorna status 500. A funcao verifica se `RESEND_API_KEY` existe nas variaveis de ambiente do Supabase (linha 30-33). Se estiver ausente, retorna 500 com "Config incompleta". E necessario confirmar que esse secret esta configurado no Supabase Dashboard.

### Problema 2: Uso do Resend SDK no lado do cliente (browser)
O arquivo `src/lib/resend.ts` importa o pacote `resend` (SDK Node.js) e tenta usa-lo diretamente no browser. Isso NUNCA funciona -- o Resend SDK so opera server-side. O `useAdmin.ts` importa `sendAdminNotification` e `sendWelcomeEmail` desse arquivo, o que causa erros silenciosos ou quebra o fluxo.

Alem disso, a chave da API Resend esta **hardcoded** no codigo client-side (`re_PwMwDDDC_...`), o que e uma vulnerabilidade de seguranca grave.

### Problema 3: Falhas silenciosas bloqueiam o fluxo
Mesmo que a Edge Function funcione, chamadas subsequentes a `sendAdminNotification` (client-side Resend) podem lancar excecoes que interrompem o fluxo.

## Solucao

### 1. Remover uso client-side do Resend SDK em `useAdmin.ts`
- Remover imports de `sendWelcomeEmail` e `sendAdminNotification` de `src/lib/resend.ts`
- Essas notificacoes ja sao tratadas pela Edge Function (que envia o email)
- As chamadas a `sendAdminNotification` no `useAdmin.ts` sao opcionais e podem ser simplesmente removidas (ou movidas para uma Edge Function separada no futuro)

### 2. Tornar `createUser` mais resiliente em `useAdmin.ts`
- Remover chamadas client-side ao Resend que podem falhar
- Melhorar tratamento de erros para mostrar mensagens claras ao admin
- Logar a resposta completa da Edge Function para debug

### 3. Remover ou limpar `src/lib/resend.ts`
- Remover a chave API hardcoded (vulnerabilidade de seguranca)
- Manter o arquivo apenas como referencia de templates, ou remove-lo se nao for usado em outro lugar

### 4. Verificar secret RESEND_API_KEY no Supabase
- Orientar o usuario a confirmar que `RESEND_API_KEY` esta definida nos Supabase Secrets (Dashboard > Settings > Edge Functions > Secrets)

## Alteracoes por Arquivo

| Arquivo | Acao |
|---|---|
| `src/hooks/useAdmin.ts` | Remover imports do Resend SDK; remover chamadas a `sendAdminNotification`/`sendWelcomeEmail`; simplificar `createUser`, `makeUserAdmin`, `deleteUser`, `updateUserSubscription`, `resendWelcomeEmail` |
| `src/lib/resend.ts` | Remover chave API hardcoded e uso do SDK client-side |

## Secao Tecnica

O `createUser` atualmente faz:
1. Gera senha temporaria
2. Chama Edge Function `send-user-credentials` (que cria o usuario E envia o email)
3. Depois chama `sendAdminNotification` via Resend SDK client-side (FALHA)

O fluxo corrigido sera:
1. Gera senha temporaria
2. Chama Edge Function `send-user-credentials`
3. Retorna resultado (sem tentativa de enviar email pelo browser)

A Edge Function ja cuida de todo o fluxo (criar usuario + enviar email), entao nao ha necessidade de duplicar a logica no client.

## Acao Manual Necessaria

Voce precisara verificar no Supabase Dashboard se o secret `RESEND_API_KEY` esta configurado:
1. Acesse supabase.com/dashboard
2. Va para o projeto `wpqthkvidfmjyroaijiq`
3. Settings > Edge Functions > Secrets
4. Confirme que `RESEND_API_KEY` existe com um valor valido

