-- Drop the existing trigger to recreate it with proper error handling
DROP TRIGGER IF EXISTS link_admin_record_to_user_trigger ON auth.users;

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION public.link_admin_record_to_user_v4()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
    RAISE WARNING 'Error in link_admin_record_to_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER link_admin_record_to_user_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_admin_record_to_user_v4();