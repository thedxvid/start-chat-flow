# Solução para o Problema de Criação de Usuários

## Problema Identificado

O erro "Insert or update on table 'profiles' violates foreign key constraint 'profiles_user_id_fkey'" ocorre porque a função atual está tentando criar registros na tabela `profiles` com um `user_id` que não existe na tabela `auth.users` do Supabase.

## Causa Raiz

A função `create_admin_user_simple` estava gerando UUIDs aleatórios para `user_id`, mas esses UUIDs não correspondem a usuários reais no sistema de autenticação do Supabase, violando a constraint de chave estrangeira.

## Solução Implementada

### 1. Modificação da Estrutura do Banco

- Removida a constraint rígida de foreign key na tabela `profiles`
- Adicionadas colunas `is_admin_created` e `admin_email` para distinguir registros administrativos
- Recriada a constraint como opcional (permite NULLs)

### 2. Nova Função `create_admin_user_v2`

- Cria registros administrativos sem violar constraints
- Permite que usuários se registrem posteriormente e sejam vinculados automaticamente
- Gerencia roles e assinaturas corretamente

### 3. Sistema de Vinculação Automática

- Trigger atualizado para vincular registros administrativos quando usuários se registram
- Ativa assinaturas automaticamente quando o usuário se cadastra

## Como Aplicar a Correção

### Passo 1: Executar o Script SQL

1. Acesse o painel do Supabase (https://supabase.com/dashboard)
2. Vá para o seu projeto
3. Navegue até "SQL Editor"
4. Copie e cole o conteúdo do arquivo `fix_user_creation_issue.sql`
5. Execute o script

### Passo 2: Verificar a Aplicação

O código da aplicação já foi atualizado para usar as novas funções:
- `create_admin_user_v2` para criar usuários
- `get_admin_users_v2` para buscar usuários

## Como Funciona Agora

### Criação de Usuário Administrativo

1. Admin cria um "registro administrativo" com email e dados do usuário
2. O sistema cria entradas nas tabelas `profiles`, `user_roles` e `subscriptions`
3. O `user_id` fica como NULL até o usuário se registrar

### Registro do Usuário Final

1. Usuário se registra normalmente com o email cadastrado administrativamente
2. O trigger `link_admin_record_to_user` detecta o registro administrativo
3. Vincula automaticamente o usuário real aos dados administrativos
4. Ativa a assinatura e define as permissões

## Vantagens da Solução

- ✅ Não viola constraints do banco de dados
- ✅ Permite criação administrativa de usuários
- ✅ Vinculação automática quando usuário se registra
- ✅ Mantém integridade dos dados
- ✅ Compatível com o sistema de autenticação do Supabase

## Teste da Solução

Após aplicar o script SQL, teste criando um novo usuário pelo painel administrativo. O erro não deve mais ocorrer.

## Arquivos Modificados

- `src/hooks/useAdmin.ts` - Atualizado para usar novas funções
- `fix_user_creation_issue.sql` - Script de correção para o banco
- `supabase/migrations/20250721000000-fix-user-creation-constraint.sql` - Migração formal