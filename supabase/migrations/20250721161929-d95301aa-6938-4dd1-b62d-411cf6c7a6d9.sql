-- Primeiro, vamos corrigir a constraint da tabela profiles para permitir user_id NULL temporariamente
-- para usuários criados administrativamente

ALTER TABLE public.profiles 
ALTER COLUMN user_id DROP NOT NULL;

-- Agora vamos corrigir a função create_admin_user_v3 para funcionar corretamente
CREATE OR REPLACE FUNCTION public.create_admin_user_v3(
  user_email text, 
  user_full_name text, 
  user_role text DEFAULT 'user'::text, 
  plan_type text DEFAULT 'free'::text
)
RETURNS json
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

-- Também vamos garantir que a trigger link_admin_record_to_user_v3 funcione corretamente
CREATE OR REPLACE FUNCTION public.link_admin_record_to_user_v3()
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

-- Recreate the trigger to ensure it's using the latest function
DROP TRIGGER IF EXISTS link_admin_record_to_user_trigger ON auth.users;
CREATE TRIGGER link_admin_record_to_user_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_admin_record_to_user_v3();