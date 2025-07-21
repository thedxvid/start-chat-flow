-- Corrigir a função create_admin_user_v3 para incluir kiwify_order_id
CREATE OR REPLACE FUNCTION public.create_admin_user_v3(
  user_email text, 
  user_full_name text, 
  user_role text DEFAULT 'user'::text, 
  plan_type text DEFAULT 'free'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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

    -- Create subscription with kiwify_order_id
    INSERT INTO subscriptions (
      user_id,
      customer_email,
      customer_name,
      status,
      plan_type,
      access_code,
      kiwify_order_id,
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
      'ADMIN-' || upper(substring(gen_random_uuid()::text, 1, 12)), -- Generate kiwify_order_id
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
$function$;