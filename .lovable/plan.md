

## Reenviar acesso em massa para os ultimos 92 usuarios

### O que sera feito

Adicionar um botao "Reenviar Acesso em Massa" no painel admin que permite selecionar os ultimos N usuarios e reenviar credenciais (nova senha + email) para todos de uma vez, usando a funcao `resetUserCredentials` que ja existe e funciona corretamente.

### Alteracoes

**1. `src/hooks/useAdmin.ts`** - Nova funcao `bulkResetCredentials`

- Recebe uma lista de usuarios `{ email, fullName, planType }[]`
- Para cada usuario, chama `resetUserCredentials` (que ja gera senha no formato `START-XXXXXXXX` e envia email via Edge Function com o link correto)
- Adiciona delay de 1 segundo entre envios para nao sobrecarregar a API do Resend (limite de rate)
- Retorna array de resultados (sucesso/erro por usuario)
- Expoe a funcao no return do hook

**2. `src/pages/Admin.tsx`** - Botao e dialog para reenvio em massa

- Adicionar botao "Reenviar Acesso em Massa" na aba de gerenciamento de usuarios
- Dialog com:
  - Campo numerico para definir quantos usuarios (padrao: 92)
  - Preview dos usuarios que serao afetados (nome + email)
  - Barra de progresso durante o envio
  - Resultados finais mostrando sucesso/falha por usuario
- Os usuarios sao ordenados por `created_at` descendente (mais recentes primeiro) e pega os primeiros N

### Detalhes tecnicos

A funcao `resetUserCredentials` ja existente faz:
1. Gera senha `START-XXXXXXXX`
2. Chama Edge Function `send-user-credentials` com `mode: 'reset'`
3. A Edge Function atualiza a senha no Supabase Auth e envia email com o link correto (`sistemastart.com/auth`)

O reenvio em massa simplesmente itera sobre os usuarios chamando essa funcao para cada um, com um delay de 1s entre chamadas para respeitar rate limits.

### Estimativa de tempo

Com 92 usuarios e delay de 1s entre cada, o processo levara aproximadamente 2 minutos. A barra de progresso mostrara o andamento em tempo real.

