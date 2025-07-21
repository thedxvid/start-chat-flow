-- Migration: Fix Admin User Creation v3
-- This migration completely fixes the admin user creation issues

-- 1. Ensure proper table structure
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS is_admin_created BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_email TEXT,
  ADD COLUMN IF NOT EXISTS temp_id UUID DEFAULT gen_random_uuid();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_admin_email ON profiles(admin_email) WHERE admin_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin_created ON profiles(is_admin_created) WHERE is_admin_created = TRUE;

-- 2. Drop existing problematic functions
DROP FUNCTION IF EXISTS create_admin_user_v2(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS link_admin_record_to_user();

-- 3. Create improved admin user creation function
CREATE OR REPLACE FUNCTION create_admin_user_v3(
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
  temp_user_id UUID;
  profile_id UUID;
  result JSON;
BEGIN
  -- Input validation
  IF user_email IS NULL OR user_email = '' THEN
    RETURN json_build_object('success', false, 'error', 'Email é obrigatório');
  END IF;
  
  IF user_full_name IS NULL OR user_full_name = '' THEN
    RETURN json_build_object('success', false, 'error', 'Nome completo é obrigatório');
  END IF;

  -- Check if email already exists in auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    RETURN json_build_object('success', false, 'error', 'Email já está registrado no sistema');
  END IF;

  -- Check if email already exists in admin records
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE admin_email = user_email AND is_admin_created = TRUE
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Email já possui registro administrativo');
  END IF;

  -- Generate temporary UUID for linking purposes
  temp_user_id := gen_random_uuid();
  profile_id := gen_random_uuid();

  -- Start transaction
  BEGIN
    -- Create profile record (admin-created, no user_id yet)
    INSERT INTO profiles (
      id,
      user_id,
      full_name,
      admin_email,
      is_admin_created,
      temp_id,
      created_at,
      updated_at
    ) VALUES (
      profile_id,
      NULL, -- Will be filled when user registers
      user_full_name,
      user_email,
      TRUE,
      temp_user_id,
      NOW(),
      NOW()
    );

    -- Create user role
    INSERT INTO user_roles (
      user_id,
      role,
      created_at,
      updated_at
    ) VALUES (
      temp_user_id,
      user_role,
      NOW(),
      NOW()
    );

    -- Create subscription
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
      temp_user_id,
      user_email,
      user_full_name,
      'pending', -- Will be activated when user registers
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

    -- Build success response
    result := json_build_object(
      'success', true,
      'temp_id', temp_user_id,
      'profile_id', profile_id,
      'email', user_email,
      'full_name', user_full_name,
      'role', user_role,
      'plan_type', plan_type,
      'message', 'Usuário criado administrativamente. Ele deve se registrar com o email: ' || user_email
    );

    RETURN result;

  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback is automatic in functions
      RETURN json_build_object(
        'success', false, 
        'error', 'Erro interno: ' || SQLERRM,
        'detail', SQLSTATE
      );
  END;
END;
$$;

-- 4. Create improved linking function for when user registers
CREATE OR REPLACE FUNCTION link_admin_record_to_user_v3()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_profile_record RECORD;
  temp_user_id UUID;
BEGIN
  -- Look for admin-created profile with this email
  SELECT id, temp_id INTO admin_profile_record
  FROM profiles 
  WHERE admin_email = NEW.email 
    AND is_admin_created = TRUE 
    AND user_id IS NULL
  LIMIT 1;

  IF admin_profile_record.id IS NOT NULL THEN
    -- Found admin record, link it to the new user
    temp_user_id := admin_profile_record.temp_id;
    
    -- Update profile to link to real user
    UPDATE profiles 
    SET 
      user_id = NEW.id,
      updated_at = NOW()
    WHERE id = admin_profile_record.id;

    -- Update user_roles to use real user_id
    UPDATE user_roles 
    SET 
      user_id = NEW.id,
      updated_at = NOW()
    WHERE user_id = temp_user_id;

    -- Update subscriptions to use real user_id and activate
    UPDATE subscriptions 
    SET 
      user_id = NEW.id,
      status = 'active',
      user_email_registered = NEW.email,
      registration_completed_at = NOW(),
      updated_at = NOW()
    WHERE user_id = temp_user_id;

    -- Don't create a new profile since we linked the existing one
    RETURN NULL;
  END IF;

  -- No admin record found, create normal profile
  INSERT INTO public.profiles (user_id, full_name, is_admin_created)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    FALSE
  );
  
  RETURN NEW;
END;
$$;

-- 5. Update trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION link_admin_record_to_user_v3();

-- 6. Create function to get admin users (improved)
CREATE OR REPLACE FUNCTION get_admin_users_v3()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  plan_type TEXT,
  status TEXT,
  is_admin_created BOOLEAN,
  registration_status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(p.user_id, p.temp_id) as user_id,
    COALESCE(au.email, p.admin_email) as email,
    p.full_name,
    COALESCE(ur.role, 'user') as role,
    COALESCE(s.plan_type, 'free') as plan_type,
    COALESCE(s.status, 'inactive') as status,
    COALESCE(p.is_admin_created, FALSE) as is_admin_created,
    CASE 
      WHEN p.user_id IS NOT NULL THEN 'registered'
      WHEN p.is_admin_created = TRUE THEN 'pending_registration'
      ELSE 'active'
    END as registration_status,
    p.created_at
  FROM profiles p
  LEFT JOIN auth.users au ON p.user_id = au.id
  LEFT JOIN subscriptions s ON (
    p.user_id = s.user_id OR 
    (p.is_admin_created = TRUE AND s.customer_email = p.admin_email)
  )
  LEFT JOIN user_roles ur ON (
    p.user_id = ur.user_id OR 
    (p.is_admin_created = TRUE AND ur.user_id = p.temp_id)
  )
  ORDER BY p.created_at DESC;
END;
$$;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION create_admin_user_v3 TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_users_v3 TO authenticated;

-- 8. Add helpful comments
COMMENT ON FUNCTION create_admin_user_v3 IS 'Função corrigida v3 para criar usuários administrativamente sem violar constraints';
COMMENT ON FUNCTION get_admin_users_v3 IS 'Função v3 para buscar usuários incluindo registros administrativos com status de registro';
COMMENT ON FUNCTION link_admin_record_to_user_v3 IS 'Função v3 para vincular registros administrativos quando usuário se registra';
COMMENT ON COLUMN profiles.temp_id IS 'ID temporário usado para vincular registros antes do usuário se registrar';
COMMENT ON COLUMN profiles.is_admin_created IS 'Indica se o registro foi criado administrativamente';
COMMENT ON COLUMN profiles.admin_email IS 'Email usado para registros administrativos antes do usuário se registrar';

-- 9. Clean up old data if needed (optional, run with caution)
-- UPDATE profiles SET temp_id = gen_random_uuid() WHERE temp_id IS NULL AND is_admin_created = TRUE;