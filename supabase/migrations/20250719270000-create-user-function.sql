-- Função para criar usuários via painel admin
CREATE OR REPLACE FUNCTION create_admin_user(
  user_email TEXT,
  user_password TEXT,
  user_full_name TEXT,
  user_role TEXT DEFAULT 'user',
  plan_type TEXT DEFAULT 'free'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  result JSON;
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Acesso negado: apenas administradores podem criar usuários');
  END IF;

  -- Verificar se email já existe
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    RETURN json_build_object('success', false, 'error', 'Email já está em uso');
  END IF;

  -- Inserir na tabela auth.users (simulação - isso precisa ser feito via API)
  -- Por enquanto, vamos criar apenas um registro na tabela profiles
  new_user_id := gen_random_uuid();

  -- Inserir perfil
  INSERT INTO profiles (id, full_name, email, created_at, updated_at)
  VALUES (new_user_id, user_full_name, user_email, NOW(), NOW());

  -- Definir role se especificado
  IF user_role = 'admin' THEN
    INSERT INTO user_roles (user_id, role, created_at)
    VALUES (new_user_id, 'admin', NOW());
  END IF;

  -- Criar assinatura se não for gratuita
  IF plan_type != 'free' THEN
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
      new_user_id,
      user_email,
      user_full_name,
      'active',
      plan_type,
      'ADMIN-' || upper(substring(gen_random_uuid()::text, 1, 8)),
      NOW() + INTERVAL '30 days',
      NOW(),
      NOW()
    );
  END IF;

  RETURN json_build_object(
    'success', true, 
    'user_id', new_user_id,
    'message', 'Usuário criado com sucesso. Ele precisará se cadastrar normalmente pelo formulário.'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Permitir que admins executem esta função
GRANT EXECUTE ON FUNCTION create_admin_user TO authenticated;

-- Comentários
COMMENT ON FUNCTION create_admin_user IS 'Função para criar usuários via painel administrativo'; 