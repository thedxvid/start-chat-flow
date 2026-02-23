

## Correção: Edge Function e Criação de Usuarios

### Problemas Identificados

Apos analise detalhada, encontrei **3 problemas criticos** que impedem a criacao de usuarios:

---

### Problema 1: Import do Resend incompativel com Deno Edge Runtime

No arquivo `supabase/functions/send-user-credentials/index.ts`, linha 4:

```
import { Resend } from "npm:resend@2.0.0";
```

O especificador `npm:` pode nao funcionar corretamente no edge runtime do Supabase. Precisa ser alterado para `https://esm.sh/resend@2.0.0` (mesmo formato ja corrigido no `send-password-reset`).

---

### Problema 2: Insert no `profiles` faltando campo obrigatorio `email`

No Edge Function, linhas 189-197, ao criar o profile do usuario:

```typescript
.upsert({
  user_id: userId,
  full_name: fullName,
  is_admin_created: true,  // campo pode nao existir
  created_at: ...,
  updated_at: ...
})
```

A tabela `profiles` exige o campo `email` (obrigatorio conforme os types). Alem disso, o campo `is_admin_created` nao existe nos types da tabela, o que pode causar erro no insert. Sem o profile ser criado corretamente, o fluxo falha silenciosamente.

---

### Problema 3: Formato de senha pode conter caracteres problematicos

A geracao de senha usa `Math.random().toString(36).slice(-8)` que gera caracteres alfanumericos. Embora funcional, o `.slice(-8)` pode retornar menos de 8 caracteres em casos raros. Vamos usar um metodo mais robusto e garantir senhas de 8 caracteres sempre.

---

### Plano de Correcoes

#### Arquivo 1: `supabase/functions/send-user-credentials/index.ts`

| Linha | Mudanca |
|-------|---------|
| 4 | Corrigir import: `npm:resend@2.0.0` para `https://esm.sh/resend@2.0.0` |
| 189-197 | Adicionar campo `email` ao insert do profile e remover `is_admin_created` |

Correcao do insert do profile:
```typescript
.upsert({
  user_id: userId,
  full_name: fullName,
  email: email,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
})
```

#### Arquivo 2: `src/hooks/useAdmin.ts`

| Linha | Mudanca |
|-------|---------|
| 107 | Melhorar geracao de senha para garantir 8 caracteres |
| 452 | Mesma melhoria na funcao resetUserCredentials |

Nova geracao de senha:
```typescript
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let code = '';
for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
const tempPassword = 'TEMP-' + code;
```

Isso garante:
- Sempre 8 caracteres apos o prefixo
- Sem caracteres ambiguos (0/O, 1/I/L)
- Funciona como senha valida no Supabase Auth

### Detalhes Tecnicos

```text
Fluxo de criacao de usuario:

Admin clica "Adicionar"
        |
        v
useAdmin.createUser() gera senha TEMP-XXXXXXXX
        |
        v
supabase.functions.invoke('send-user-credentials')
        |
        v
Edge Function:
  1. import Resend  <-- FALHA se npm: nao resolve
  2. createUser no Auth
  3. Insert profile  <-- FALHA sem campo email
  4. Insert role
  5. Insert subscription
  6. Envia email com senha
        |
        v
Usuario recebe email e faz login
```

A correcao do import e do insert do profile resolve os dois pontos de falha na Edge Function. A melhoria na geracao de senha garante que as credenciais sempre funcionem.

