-- Add admin functionality
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role text NOT NULL DEFAULT 'user',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
));

CREATE POLICY "Admins can insert user roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
));

CREATE POLICY "Admins can update user roles" 
ON public.user_roles 
FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
));

CREATE POLICY "Admins can delete user roles" 
ON public.user_roles 
FOR DELETE 
USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
));

-- Add trigger for updated_at
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert admin user (davicastrowp@gmail.com)
-- We'll get the user_id after they sign up
-- For now, create a function to make someone admin by email
CREATE OR REPLACE FUNCTION public.make_user_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Get user ID from auth.users
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', user_email;
    END IF;
    
    -- Insert or update role to admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id) 
    DO UPDATE SET role = 'admin', updated_at = now();
END;
$$;

-- Add unique constraint on user_id
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);