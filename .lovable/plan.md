

## Problema: "Database error creating new user" persiste

### Causa raiz confirmada

O trigger `on_auth_user_created_simple` na tabela `auth.users` chama a funcao `handle_new_user_simple()` que tenta inserir na tabela `profiles` **sem incluir a coluna `email`**. A coluna `email` e NOT NULL na tabela, entao o INSERT falha e o GoTrue retorna "Database error creating new user".

O SQL anterior pode nao ter funcionado por varios motivos (erro silencioso, outro trigger ativo, etc).

### Solucao: Migration definitiva + Edge Function limpa

**Passo 1: Nova migration que limpa TODOS os triggers e funcoes quebradas**

Criar migration SQL que:
- Remove TODOS os triggers possiveis em `auth.users` (3 nomes diferentes encontrados nas migrations)
- Remove TODAS as funcoes de trigger antigas (5 funcoes diferentes)
- Cria uma unica funcao `handle_new_user_v2()` que insere corretamente `user_id`, `full_name` E `email`
- Cria um unico trigger `on_auth_user_created`

```sql
-- Remover TODOS os triggers possiveis
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_simple ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_link_admin ON auth.users;

-- Remover TODAS as funcoes de trigger antigas
DROP FUNCTION IF EXISTS public.handle_new_user_simple();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.link_admin_record_to_user();
DROP FUNCTION IF EXISTS public.link_admin_record_to_user_v3();
DROP FUNCTION IF EXISTS public.link_admin_record_to_user_v5();
DROP FUNCTION IF EXISTS public.handle_normal_user_signup();

-- Criar funcao segura
CREATE OR REPLACE FUNCTION public.handle_new_user_v2()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user_v2 error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Criar trigger unico
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_v2();
```

**Passo 2: Manter a Edge Function como esta**

A Edge Function atual ja esta limpa e correta - ela cria o usuario via `admin.createUser()`, depois faz upsert manual no profile/role/subscription. Nao precisa de alteracoes.

### Por que o SQL anterior pode nao ter funcionado

1. Se houve erro ao executar (por exemplo, se `handle_new_user_v2` ja existia com assinatura diferente)
2. Se o trigger `on_auth_user_created_simple` nao foi dropado (nome diferente do `on_auth_user_created`)
3. Se havia multiplos triggers ativos simultaneamente

### O que muda nesta solucao

- A migration limpa **todos os 3 nomes de trigger** e **todas as 6 funcoes** que foram criadas ao longo das migrations
- Usa `ON CONFLICT DO UPDATE` em vez de `DO NOTHING` para garantir que o email seja preenchido
- Resultado: apenas 1 trigger e 1 funcao, simples e funcional

### Instrucoes apos aprovar

Depois que a migration for criada, voce deve:
1. Ir no Supabase Dashboard
2. Abrir o SQL Editor
3. Copiar e colar o SQL da migration
4. Executar e confirmar que nao houve erros
5. Tentar criar um usuario novamente

