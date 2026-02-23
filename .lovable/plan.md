

## Problem: "Database error creating new user"

The root cause is a broken PostgreSQL trigger on `auth.users` that you cannot see because you were looking at the **`public` schema** triggers. The trigger is on the `auth` schema.

### What's happening

1. Migration `20250721215901` created a trigger called `on_auth_user_created_simple` on `auth.users`
2. This trigger calls `handle_new_user_simple()` which tries to INSERT into `profiles` with a column `is_admin_created` that **does not exist** in the current table, and also **omits** the required `email` column
3. Even though the function has an EXCEPTION handler, Supabase GoTrue reports "Database error creating new user" when the trigger encounters issues
4. The Edge Function then retries but gets the same error

### Solution (2 steps)

**Step 1: New database migration** - Create a migration that:
- Drops the broken trigger `on_auth_user_created_simple` from `auth.users`
- Drops the broken function `handle_new_user_simple()`
- Creates a new, minimal trigger function `handle_new_user_v2()` that only inserts `user_id`, `full_name`, and `email` (columns that actually exist) with proper conflict handling and error catching
- Creates a new trigger using this safe function

**Step 2: Simplify the Edge Function** - Clean up `supabase/functions/send-user-credentials/index.ts`:
- Remove the entire `ensureAuthTrigger` function and all trigger-repair logic (it never worked because you can't run raw SQL from the JS client)
- Keep the existing manual profile/role/subscription creation logic (which is the actual working code)
- Remove the retry-on-trigger-error block since the trigger will now be fixed
- Result: a much simpler, more maintainable function

### Technical details

**New migration SQL:**
```sql
DROP TRIGGER IF EXISTS on_auth_user_created_simple ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_simple();

CREATE OR REPLACE FUNCTION public.handle_new_user_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user_v2 error: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_v2();
```

**Edge Function changes:** Remove ~60 lines of dead trigger-repair code, making the function cleaner and focused on its core job: create user, insert profile/role/subscription, send email.

