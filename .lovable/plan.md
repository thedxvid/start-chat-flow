

# Corrigir formato do email e URL duplicada /auth/auth

## Diagnostico

O codigo das Edge Functions no repositorio ja esta correto:
- Template com cores douradas (#c9a84c) -- OK
- URL do botao: `https://sistemastart.com/auth` (sem duplicacao) -- OK
- Sem campo "Codigo de Acesso" no template de credenciais -- OK

**O problema e que as Edge Functions deployadas no Supabase sao uma versao antiga** que ainda tem o formato antigo, o campo "Codigo de Acesso" e a URL `auth/auth`.

## Solucao

### 1. Reimplantar todas as Edge Functions

As seguintes funcoes precisam ser redeployadas para que o codigo atualizado entre em vigor:

- `send-user-credentials` — template atualizado com cor dourada e URL correta
- `resend-credentials` — mesmo template atualizado
- `kiwify-webhook` — ja esta correto mas redeployar para consistencia
- `send-password-reset` — template de reset de senha (ja correto no codigo)
- `refresh-subscription-after-reset` — funcao nova criada recentemente

### 2. Nenhuma alteracao de codigo necessaria

Os arquivos no repositorio ja contem:
- Template com identidade visual dourada (#c9a84c)
- URL `https://sistemastart.com/auth` (sem duplicacao)
- Campos corretos: Email, Senha, Plano (sem "Codigo de Acesso" no fluxo admin)

## Resultado esperado

Apos o redeploy:
- Emails de credenciais terao o visual dourado profissional
- Botao "Acessar o Sistema" apontara para `https://sistemastart.com/auth` (URL correta)
- Nao aparecera mais o campo "Codigo de Acesso" nos emails de criacao/reset de usuario pelo admin
- O campo "Codigo de Acesso" continuara aparecendo apenas nos emails do Kiwify (apos pagamento), onde e necessario

