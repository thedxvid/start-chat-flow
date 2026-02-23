

## Correção: Importação em Massa Cria Usuarios com Plano Free (Sem Acesso)

### Problema

Quando usuarios sao importados em massa via CSV/XLSX, se o arquivo nao tem uma coluna "plano", o sistema usa `'free'` como padrao. Depois, no login, o sistema verifica:

```
setIsSubscribed(isValid && data.plan_type !== 'free')
```

Isso significa que **todos os usuarios com plano free ficam bloqueados** -- nao conseguem acessar o sistema mesmo tendo login valido.

### Correções Necessarias

#### 1. Padrao de plano na importacao em massa (Admin.tsx)
Alterar o valor padrao de `'free'` para `'premium'` no mapeamento de colunas do CSV/XLSX (linha 232).

#### 2. Padrao de plano no createUser (useAdmin.ts)  
Alterar `planType: userData.planType || 'free'` para `planType: userData.planType || 'premium'` (linha 118).

#### 3. Padrao de plano no bulkCreateUsers (useAdmin.ts)
Alterar `planType: userData.planType || 'free'` para `planType: userData.planType || 'premium'` (linha 440).

#### 4. Logica de acesso no login (useAuthSimple.ts)
Remover o filtro que bloqueia plano free:
- **Antes:** `setIsSubscribed(isValid && data.plan_type !== 'free')`
- **Depois:** `setIsSubscribed(isValid)`

Qualquer usuario com subscription ativa tera acesso, independente do tipo de plano.

#### 5. Corrigir erro de build na Edge Function (send-password-reset/index.ts)
Alterar importacao do Resend:
- **Antes:** `import { Resend } from "npm:resend@2.0.0"`
- **Depois:** `import { Resend } from "https://esm.sh/resend@2.0.0"`

### Detalhes Tecnicos

| Arquivo | Linha | Mudanca |
|---------|-------|---------|
| `src/pages/Admin.tsx` | 232 | Padrao do planType de `'free'` para `'premium'` |
| `src/hooks/useAdmin.ts` | 118 | Padrao do planType de `'free'` para `'premium'` |
| `src/hooks/useAdmin.ts` | 440 | Padrao do planType de `'free'` para `'premium'` |
| `src/hooks/useAuthSimple.ts` | ~97 | Remover filtro `plan_type !== 'free'` |
| `supabase/functions/send-password-reset/index.ts` | 4 | Corrigir import do Resend |

### Impacto

- Novos usuarios importados terao plano `premium` por padrao (com acesso)
- Usuarios existentes com plano `free` passarao a ter acesso (pela correcao no useAuthSimple)
- Erro de build sera resolvido

