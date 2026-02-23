
# Plano: Corrigir Fluxo de Recuperacao de Senha

## Problema

Quando o usuario clica no link de recuperacao de senha no email, ele e autenticado automaticamente pelo Supabase e redirecionado para a aplicacao. Porem, como esse usuario pode nao ter assinatura ativa, o `ProtectedRoute` bloqueia o acesso e exibe "Acesso Premium Necessario" em vez do formulario de redefinicao de senha.

O problema tem duas causas:
1. O `ProtectedRoute` nao verifica se o usuario esta no meio de um fluxo de recuperacao de senha
2. Nao existe uma rota dedicada `/reset-password` fora da protecao de assinatura

## Solucao

Duas alteracoes simples e eficazes:

### 1. ProtectedRoute - Detectar recovery e redirecionar

Adicionar verificacao no `ProtectedRoute` para detectar tokens de recovery na URL hash. Se detectado, redirecionar automaticamente para `/auth` onde o formulario de nova senha ja existe.

```text
FLUXO CORRIGIDO:
  1. Usuario clica no link do email
  2. Supabase autentica e redireciona (com hash #type=recovery)
  3. ProtectedRoute detecta "type=recovery" no hash
  4. Redireciona para /auth (que NAO esta protegida)
  5. Auth.tsx detecta o recovery e mostra o formulario de nova senha
```

### 2. Auth.tsx - Melhorar deteccao de recovery

Garantir que a pagina Auth detecte corretamente o evento `PASSWORD_RECOVERY` e tambem verifique a URL hash de forma robusta, incluindo apos redirecionamentos.

## Detalhes Tecnicos

### Arquivo: `src/components/auth/ProtectedRoute.tsx`

- Antes da verificacao de `hasAccess`, checar se `window.location.hash` contem `type=recovery`
- Se sim, fazer `Navigate to="/auth"` passando o hash completo para que Auth.tsx possa processar

### Arquivo: `src/pages/Auth.tsx`

- Melhorar o `useEffect` de deteccao de recovery para tambem verificar o hash apos um pequeno delay (para cobrir race conditions)
- Adicionar listener para `PASSWORD_RECOVERY` event que funcione mesmo apos redirecionamento

## Resumo das Alteracoes

| Arquivo | Acao |
|---|---|
| `src/components/auth/ProtectedRoute.tsx` | Detectar hash de recovery e redirecionar para /auth |
| `src/pages/Auth.tsx` | Melhorar deteccao robusta do evento de recovery |
