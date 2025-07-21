-- SCRIPT PARA CORRIGIR O PROBLEMA DE ADMIN
-- Execute este script no Supabase Dashboard -> SQL Editor

-- 1. Desabilitar RLS temporariamente para evitar recursão
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 2. Remover todas as políticas existentes
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;

-- 3. Dar permissões básicas
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO anon;

-- 4. Garantir que você seja admin
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Buscar seu ID de usuário
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'davicastrowp@gmail.com';
    
    IF admin_user_id IS NOT NULL THEN
        -- Inserir ou atualizar role de admin
        INSERT INTO public.user_roles (user_id, role)
        VALUES (admin_user_id, 'admin')
        ON CONFLICT (user_id) 
        DO UPDATE SET role = 'admin', updated_at = now();
        
        RAISE NOTICE 'Admin confirmado para usuário: %', admin_user_id;
    ELSE
        RAISE NOTICE 'Usuário davicastrowp@gmail.com não encontrado';
    END IF;
END $$;

-- 5. Verificar se funcionou
SELECT 
    u.email,
    ur.role,
    ur.created_at
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'davicastrowp@gmail.com';

-- Este SELECT deve retornar:
-- email: davicastrowp@gmail.com
-- role: admin
-- created_at: [timestamp] 