

# Plano: Corrigir Redirecionamento de Recuperacao de Senha

## Problema Raiz

Quando o usuario clica no link de recuperacao no email, o Supabase **consome o hash** (`#type=recovery`) durante o processamento do token e autentica o usuario automaticamente. Depois disso, o hash desaparece da URL. Entao quando o `ProtectedRoute` verifica `window.location.hash`, ele nao encontra mais `type=recovery` -- o usuario ja esta autenticado e e enviado direto para o dashboard.

```text
FLUXO ATUAL (com bug):
  1. Usuario clica no link do email (URL com #access_token=...&type=recovery)
  2. Supabase JS SDK intercepta, consome o hash, autentica o usuario
  3. Hash desaparece da URL
  4. ProtectedRoute roda: hash vazio, usuario autenticado -> mostra dashboard
  5. Formulario de nova senha NUNCA aparece
```

## Solucao

Detectar o evento `PASSWORD_RECOVERY` no **AuthProvider** (nivel global) e expor uma flag `isRecoveryMode`. O `ProtectedRoute` usa essa flag para redirecionar para `/auth`, onde o formulario de nova senha e exibido.

```text
FLUXO CORRIGIDO:
  1. Usuario clica no link do email
  2. Supabase consome hash, autentica, dispara evento PASSWORD_RECOVERY
  3. useAuthSimple detecta o evento -> seta isRecoveryMode = true
  4. ProtectedRoute ve isRecoveryMode = true -> redireciona para /auth
  5. Auth.tsx ve isRecoveryMode -> mostra formulario de nova senha
  6. Apos redefinir, isRecoveryMode volta a false
```

## Alteracoes por Arquivo

### 1. `src/hooks/useAuthSimple.ts`
- Adicionar estado `isRecoveryMode` (boolean)
- No `onAuthStateChange`, quando `event === 'PASSWORD_RECOVERY'`, setar `isRecoveryMode = true`
- Adicionar funcao `clearRecoveryMode()` para resetar a flag
- Expor `isRecoveryMode` e `clearRecoveryMode` na interface `AuthContextType`

### 2. `src/components/auth/ProtectedRoute.tsx`
- Importar `isRecoveryMode` do `useAuth()`
- Antes da verificacao de `hasAccess`, checar se `isRecoveryMode === true`
- Se sim, redirecionar para `/auth` (sem depender do hash)

### 3. `src/pages/Auth.tsx`
- Importar `isRecoveryMode` e `clearRecoveryMode` do `useAuth()`
- Usar `isRecoveryMode` para exibir o formulario de nova senha automaticamente
- Chamar `clearRecoveryMode()` apos a senha ser redefinida com sucesso

### 4. `src/components/auth/AuthProvider.tsx`
- Apenas garantir que o provider repassa os novos campos (se necessario)

## Resumo

| Arquivo | Acao |
|---|---|
| `src/hooks/useAuthSimple.ts` | Adicionar `isRecoveryMode` + `clearRecoveryMode` |
| `src/components/auth/ProtectedRoute.tsx` | Checar `isRecoveryMode` e redirecionar |
| `src/pages/Auth.tsx` | Usar flag do contexto em vez de hash local |
| `src/components/auth/AuthProvider.tsx` | Repassar novos campos do provider |

