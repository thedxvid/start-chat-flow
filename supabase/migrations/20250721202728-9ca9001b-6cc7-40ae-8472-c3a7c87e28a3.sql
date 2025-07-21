
-- Drop the existing trigger and function to recreate them properly
DROP TRIGGER IF EXISTS link_admin_record_to_user_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.link_admin_record_to_user_v4();

-- Recreate the function with explicit search_path and schema references
CREATE OR REPLACE FUNCTION public.link_admin_record_to_user_v5()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  admin_profile_record RECORD;
  temp_user_id UUID;
BEGIN
  -- Validate that required tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    RAISE WARNING 'Table public.profiles does not exist, skipping admin record linking';
    RETURN NEW;
  END IF;

  -- Look for admin-created profile with this email using explicit schema
  SELECT id, temp_id INTO admin_profile_record
  FROM public.profiles 
  WHERE admin_email = NEW.email 
    AND is_admin_created = TRUE 
    AND user_id IS NULL
  LIMIT 1;

  IF admin_profile_record.id IS NOT NULL THEN
    -- Found admin record, link it to the new user
    temp_user_id := admin_profile_record.temp_id;
    
    -- Update profile to link to real user
    UPDATE public.profiles 
    SET 
      user_id = NEW.id,
      updated_at = NOW()
    WHERE id = admin_profile_record.id;

    -- Update user_roles to use real user_id (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
      UPDATE public.user_roles 
      SET 
        user_id = NEW.id,
        updated_at = NOW()
      WHERE user_id = temp_user_id;
    END IF;

    -- Update subscriptions to use real user_id and activate (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
      UPDATE public.subscriptions 
      SET 
        user_id = NEW.id,
        status = 'active',
        user_email_registered = NEW.email,
        registration_completed_at = NOW(),
        updated_at = NOW()
      WHERE user_id = temp_user_id;
    END IF;

    -- Don't create a new profile since we linked the existing one
    RETURN NEW;
  END IF;

  -- No admin record found, create normal profile only if it doesn't exist
  INSERT INTO public.profiles (user_id, full_name, is_admin_created)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    FALSE
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in link_admin_record_to_user trigger: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$function$;

-- Recreate the trigger with the new function
CREATE TRIGGER link_admin_record_to_user_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_admin_record_to_user_v5();
