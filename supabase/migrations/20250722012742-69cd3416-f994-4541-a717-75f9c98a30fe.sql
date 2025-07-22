
-- Restaurar o usuário davicastrowp@gmail.com como administrador
INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
VALUES ('b5d2f8ef-f458-46f5-b087-259a3eaaa0f8', 'admin', NOW(), NOW())
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'admin',
  updated_at = NOW();

-- Verificar se foi restaurado corretamente
SELECT 
  ur.role,
  au.email,
  ur.created_at,
  ur.updated_at
FROM public.user_roles ur 
JOIN auth.users au ON ur.user_id = au.id 
WHERE au.email = 'davicastrowp@gmail.com';
