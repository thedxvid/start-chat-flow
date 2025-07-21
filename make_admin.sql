-- Script para tornar o usuário davicastrowp@gmail.com administrador
-- Execute este script no SQL Editor do Supabase

-- Tornar davicastrowp@gmail.com administrador
SELECT public.make_user_admin('davicastrowp@gmail.com');

-- Para verificar se foi criado corretamente:
SELECT ur.role, u.email, ur.created_at
FROM public.user_roles ur 
JOIN auth.users u ON ur.user_id = u.id 
WHERE u.email = 'davicastrowp@gmail.com';

-- Se der erro de função não encontrada, execute estas linhas primeiro:
-- CREATE OR REPLACE FUNCTION public.make_user_admin(user_email text)
-- RETURNS void
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- AS $$
-- DECLARE
--     target_user_id uuid;
-- BEGIN
--     -- Get user ID from auth.users
--     SELECT id INTO target_user_id 
--     FROM auth.users 
--     WHERE email = user_email;
--     
--     IF target_user_id IS NULL THEN
--         RAISE EXCEPTION 'User with email % not found', user_email;
--     END IF;
--     
--     -- Insert or update role to admin
--     INSERT INTO public.user_roles (user_id, role)
--     VALUES (target_user_id, 'admin')
--     ON CONFLICT (user_id) 
--     DO UPDATE SET role = 'admin', updated_at = now();
-- END;
-- $$; 