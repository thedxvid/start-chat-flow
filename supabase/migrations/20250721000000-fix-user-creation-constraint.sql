-- Fix user creation constraint issue
-- Migration: 20250721000000-fix-user-creation-constraint.sql

-- 1. Primeiro, vamos modificar a estrutura para permitir criação de registros administrativos
-- sem depender de auth.users

-- Remover a constraint de foreign key temporariamente para profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Adicionar uma nova coluna para distinguir usuários reais de registros administrativos
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin_created BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_email TEXT;

-- Recriar a constraint como opcional (permitir NULLs)
-- Isso permite que tenhamos registros administrativos que não estão vinculados a auth.users ainda
ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE DEFERRABLE;

-- 2. Criar nova função que funciona corretamente
CREATE OR REPLACE FUNCTION create_admin_user_v2(
  user_email TEXT,
  user_full_name TEXT,
  user_role TEXT DEFAULT 'user',
  plan_type TEXT DEFAULT 'free'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_record_id UUID;
  result JSON;
BEGIN
  -- Verificar se email já existe nos registros administrativos
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE admin_email = user_email AND is_admin_created = TRUE
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Email já está registrado administrativamente');
  END IF;

  -- Verificar se email já existe em auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    RETURN json_build_object('success', false, 'error', 'Email já está em uso no sistema');
  END IF;

  -- Gerar UUID para o novo registro
  new_record_id := gen_random_uuid();

  -- Inserir perfil administrativo (sem user_id por enquanto)
  INSERT INTO profiles (
    id,
    user_id,
    full_name,
    admin_email,
    is_admin_created,
    created_at, 
    updated_at
  ) VALUES (
    gen_random_uuid(),
    NULL, -- Será preenchido quando o usuário se registrar
    user_full_name,
    user_email,
    TRUE,
    NOW(), 
    NOW()
  );

  -- Definir role
  INSERT INTO user_roles (user_id, role, created_at, updated_at)
  VALUES (new_record_id, user_role, NOW(), NOW());

  -- Criar assinatura
  INSERT INTO subscriptions (
    user_id,
    customer_email,
    customer_name,
    status,
    plan_type,
    access_code,
    expires_at,
    created_at,
    updated_at
  ) VALUES (
    new_record_id,
    user_email,
    user_full_name,
    'pending', -- Será ativado quando o usuário se registrar
    plan_type,
    CASE 
      WHEN plan_type = 'free' THEN 'FREE-' || upper(substring(gen_random_uuid()::text, 1, 8))
      ELSE 'ADMIN-' || upper(substring(gen_random_uuid()::text, 1, 8))
    END,
    CASE 
      WHEN plan_type = 'free' THEN NULL
      ELSE NOW() + INTERVAL '30 days'
    END,
    NOW(),
    NOW()
  );

  RETURN json_build_object(
    'success', true, 
    'record_id', new_record_id,
    'email', user_email,
    'full_name', user_full_name,
    'role', user_role,
    'plan_type', plan_type,
    'message', 'Registro administrativo criado. O usuário deve se cadastrar normalmente com o email: ' || user_email
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 3. Função para vincular registro administrativo quando usuário se registra
CREATE OR REPLACE FUNCTION link_admin_record_to_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_profile_id UUID;
BEGIN
  -- Verificar se existe um registro administrativo para este email
  SELECT id INTO admin_profile_id
  FROM profiles 
  WHERE admin_email = NEW.email AND is_admin_created = TRUE AND user_id IS NULL;

  IF admin_profile_id IS NOT NULL THEN
    -- Vincular o registro administrativo ao usuário real
    UPDATE profiles 
    SET 
      user_id = NEW.id,
      updated_at = NOW()
    WHERE id = admin_profile_id;

    -- Atualizar user_roles
    UPDATE user_roles 
    SET user_id = NEW.id, updated_at = NOW()
    WHERE user_id = admin_profile_id;

    -- Atualizar subscriptions
    UPDATE subscriptions 
    SET 
      user_id = NEW.id, 
      status = 'active',
      user_email_registered = NEW.email,
      registration_completed_at = NOW(),
      updated_at = NOW()
    WHERE customer_email = NEW.email AND user_id = admin_profile_id;

    -- Não criar um novo profile, pois já existe o administrativo
    RETURN NULL;
  END IF;

  -- Se não há registro administrativo, criar profile normal
  INSERT INTO public.profiles (user_id, full_name, is_admin_created)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    FALSE
  );
  
  RETURN NEW;
END;
$$;

-- 4. Atualizar o trigger existente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION link_admin_record_to_user();

-- 5. Função para buscar usuários incluindo registros administrativos
CREATE OR REPLACE FUNCTION get_admin_users_v2()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  plan_type TEXT,
  status TEXT,
  is_admin_created BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(p.user_id, ur.user_id) as user_id,
    COALESCE(s.customer_email, p.admin_email) as email,
    p.full_name,
    COALESCE(ur.role, 'user') as role,
    COALESCE(s.plan_type, 'free') as plan_type,
    COALESCE(s.status, 'inactive') as status,
    COALESCE(p.is_admin_created, FALSE) as is_admin_created,
    p.created_at
  FROM profiles p
  LEFT JOIN subscriptions s ON (p.user_id = s.user_id OR s.customer_email = p.admin_email)
  LEFT JOIN user_roles ur ON (p.user_id = ur.user_id OR ur.user_id = p.id)
  ORDER BY p.created_at DESC;
END;
$$;

-- 6. Permissões
GRANT EXECUTE ON FUNCTION create_admin_user_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_users_v2 TO authenticated;

-- 7. Comentários
COMMENT ON FUNCTION create_admin_user_v2 IS 'Função corrigida para criar usuários administrativamente sem violar constraints';
COMMENT ON FUNCTION get_admin_users_v2 IS 'Função para buscar usuários incluindo registros administrativos';
COMMENT ON COLUMN profiles.is_admin_created IS 'Indica se o registro foi criado administrativamente';
COMMENT ON COLUMN profiles.admin_email IS 'Email usado para registros administrativos antes do usuário se registrar';