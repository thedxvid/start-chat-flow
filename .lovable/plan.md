
# Corrigir painel admin: carregar usuarios automaticamente, reenviar e excluir

## Problemas encontrados

### 1. Usuarios nao carregam automaticamente
O hook `useAdmin` nao tem nenhum `useEffect` que chame `fetchUsers()` ao iniciar. Os usuarios so aparecem quando o admin clica manualmente em "Atualizar Dados".

### 2. Excluir usuario nao funciona
O codigo usa `supabase.auth.admin.deleteUser(userId)` diretamente do cliente (linha 210 de useAdmin.ts). A API admin do Supabase **nao funciona** com o token anon/authenticated — precisa do service_role_key. Isso precisa ser feito via Edge Function (como o `cleanup-users` que ja existe).

### 3. Reenviar acesso pode falhar silenciosamente
O `resetUserCredentials` chama `supabase.functions.invoke('send-user-credentials')` que funciona, mas erros de non-2xx podem nao ser tratados corretamente em todos os cenarios.

---

## Solucao

### Arquivo: `src/hooks/useAdmin.ts`

**Mudanca 1 — Carregar usuarios automaticamente:**
- Adicionar um `useEffect` que chama `fetchUsers()` assim que `isAdmin` for `true`.
- Isso elimina a necessidade de clicar em "Atualizar Dados".

**Mudanca 2 — Corrigir exclusao de usuario:**
- Substituir `supabase.auth.admin.deleteUser(userId)` por uma chamada a Edge Function `cleanup-users` que ja existe e usa o service_role_key.
- A funcao `cleanup-users` ja aceita `{ action: 'cleanup_incomplete', email }` e remove o usuario do auth + dados relacionados.
- Alterar `deleteUser` para chamar `supabase.functions.invoke('cleanup-users', { body: { action: 'cleanup_incomplete', email: userEmail } })`.

**Mudanca 3 — Melhorar tratamento de erro no reenviar:**
- Garantir que o `resetUserCredentials` trate corretamente respostas parciais e erros de rede, com mensagens claras para o usuario.

### Resultado esperado
- Ao entrar no painel admin, a lista de usuarios carrega automaticamente sem precisar clicar em nada.
- O botao de excluir usuario funciona corretamente usando a Edge Function existente.
- O botao de reenviar acesso funciona de forma robusta com feedback claro.
