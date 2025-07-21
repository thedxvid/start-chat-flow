-- Temporary fix: Disable RLS on user_roles to avoid recursion
-- This is a quick fix for development
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;

-- Grant basic permissions
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO anon;

-- Ensure the admin user exists and is correctly set
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Get the user ID for davicastrowp@gmail.com
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'davicastrowp@gmail.com';
    
    IF admin_user_id IS NOT NULL THEN
        -- Ensure admin role exists
        INSERT INTO public.user_roles (user_id, role)
        VALUES (admin_user_id, 'admin')
        ON CONFLICT (user_id) 
        DO UPDATE SET role = 'admin', updated_at = now();
        
        RAISE NOTICE 'Admin role confirmed for user %', admin_user_id;
    ELSE
        RAISE NOTICE 'User davicastrowp@gmail.com not found in auth.users';
    END IF;
END $$; 