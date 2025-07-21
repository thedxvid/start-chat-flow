-- Limpar dados inconsistentes e criar função para verificação completa
-- Remover usuário com dados incompletos
DELETE FROM user_roles WHERE user_id = 'bd206935-3f54-4d58-b384-20767c81b1f2';

-- Criar função para limpeza completa de usuário
CREATE OR REPLACE FUNCTION public.cleanup_incomplete_user(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_uuid uuid;
BEGIN
    -- Buscar ID do usuário
    SELECT id INTO user_uuid FROM auth.users WHERE email = user_email;
    
    IF user_uuid IS NOT NULL THEN
        -- Remover dados relacionados
        DELETE FROM subscriptions WHERE user_id = user_uuid OR customer_email = user_email;
        DELETE FROM user_roles WHERE user_id = user_uuid;
        DELETE FROM profiles WHERE user_id = user_uuid OR admin_email = user_email;
        DELETE FROM conversations WHERE user_id = user_uuid;
        
        -- Remover da tabela auth.users (usando admin)
        -- Nota: Isso deve ser feito via Edge Function, não SQL direto
    END IF;
END;
$$;