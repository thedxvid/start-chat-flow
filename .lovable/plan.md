

## Correcoes para os 3 problemas

### Problema 1: Email caindo no spam

Isso acontece por configuracao de DNS do dominio `sistemastart.com`, nao por codigo. Para resolver:

1. Acesse o painel do **Resend** (resend.com/domains)
2. Verifique se o dominio `sistemastart.com` tem os registros DNS configurados:
   - **SPF** (TXT record) - autoriza o Resend a enviar emails pelo seu dominio
   - **DKIM** (CNAME records) - assina digitalmente os emails
   - **DMARC** (TXT record) - politica de autenticacao
3. Se algum registro estiver faltando ou com status "Pending", adicione-o no painel DNS do seu provedor de hospedagem
4. Aguarde propagacao (pode levar ate 48h, mas geralmente e rapido)

Sem esses registros DNS, provedores como Gmail e Outlook marcam o email como spam.

### Problema 2: Link com `/auth/auth` duplicado

A variavel de ambiente `SITE_URL` no Supabase provavelmente esta configurada como `https://sistemastart.com/auth`. O codigo faz `siteUrl + "/auth"`, resultando em `sistemastart.com/auth/auth`.

**Correcao no codigo:** Remover a barra `/auth` da concatenacao na Edge Function e usar apenas `siteUrl` diretamente, mas tambem garantir que o path `/auth` esteja incluido de forma segura. A melhor abordagem: limpar a trailing slash do `siteUrl` e manter o `/auth` no codigo, mas tambem verificar se o `SITE_URL` ja termina com `/auth`.

Alteracao em `supabase/functions/send-user-credentials/index.ts` (linha 42 e 274):
- Limpar o `siteUrl` para nunca terminar com `/auth` ou `/`
- Manter o link como `${cleanUrl}/auth`

```typescript
// Linha 42 - limpar SITE_URL
const rawSiteUrl = Deno.env.get('SITE_URL') || 'https://sistemastart.com';
const siteUrl = rawSiteUrl.replace(/\/auth\/?$/, '').replace(/\/$/, '');
```

A linha 274 do template (`${siteUrl}/auth`) ja esta correta apos essa limpeza.

### Problema 3: Senha vs Codigo de Acesso - para que serve cada um?

O **codigo de acesso** (`access_code` na tabela `subscriptions`, formato `START-XXXXXXXX`) era usado no fluxo de **cadastro via Kiwify**: o usuario comprava, recebia um codigo, e usava esse codigo na aba "Cadastrar" para criar sua conta.

Quando o admin cria o usuario manualmente, o codigo de acesso **nao tem utilidade** porque a conta ja esta criada. O usuario so precisa da **senha temporaria** para fazer login.

**Correcao:** Remover a geracao do `access_code` no fluxo de criacao por admin na Edge Function, ja que nao serve para nada nesse contexto. E simplificar a mensagem do email para deixar claro que o usuario so precisa do email + senha.

Alteracoes:
- Na Edge Function, usar um `access_code` fixo como `'ADMIN-CREATED'` em vez de gerar um codigo aleatorio (para nao confundir)
- Remover qualquer menção a "codigo de acesso" do email de admin (que ja nao esta no template atual, entao esta ok)

---

### Resumo das alteracoes

| Arquivo | Alteracao |
|---|---|
| `supabase/functions/send-user-credentials/index.ts` | Limpar `SITE_URL` para evitar `/auth/auth`; trocar `access_code` aleatorio por `'ADMIN-CREATED'` |
| DNS do dominio (manual) | Configurar SPF, DKIM, DMARC no Resend para evitar spam |

