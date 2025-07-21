-- Fix subscriptions table structure to work with auth system
-- Add user_id column and update the table to be compatible with useAuth.ts

-- Add user_id column if it doesn't exist
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for user_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Update RLS policies to be more flexible
DROP POLICY IF EXISTS "Allow public access code validation" ON subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;

-- Create new policies that work with user_id
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all subscriptions" ON subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Allow authenticated users to read subscriptions by access code (for validation)
CREATE POLICY "Allow subscription validation by access code" ON subscriptions
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create a function to link access codes to users
CREATE OR REPLACE FUNCTION link_subscription_to_user(
  p_access_code TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update subscription with user_id if access_code is valid and not already linked
  UPDATE subscriptions 
  SET 
    user_id = p_user_id,
    user_email_registered = (SELECT email FROM auth.users WHERE id = p_user_id),
    registration_completed_at = NOW(),
    status = 'active',
    updated_at = NOW()
  WHERE 
    access_code = p_access_code 
    AND user_id IS NULL 
    AND status IN ('pending', 'active');
    
  -- Return true if a row was updated
  RETURN FOUND;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION link_subscription_to_user TO authenticated;

-- Create a simple subscription for development (if no subscriptions exist)
DO $$
BEGIN
  -- Check if there are any subscriptions
  IF NOT EXISTS (SELECT 1 FROM subscriptions LIMIT 1) THEN
    -- Create a default active subscription for development
    INSERT INTO subscriptions (
      kiwify_order_id,
      customer_email,
      customer_name,
      status,
      plan_type,
      access_code,
      expires_at,
      created_at,
      updated_at
    ) VALUES (
      'DEV_ORDER_001',
      'dev@example.com',
      'Development User',
      'active',
      'premium',
      'DEV_ACCESS_2024',
      NOW() + INTERVAL '1 year',
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Development subscription created with access code: DEV_ACCESS_2024';
  END IF;
END $$;

-- Comments
COMMENT ON COLUMN subscriptions.user_id IS 'Foreign key to auth.users - links subscription to registered user';
COMMENT ON FUNCTION link_subscription_to_user IS 'Links an access code to a registered user, activating their subscription'; 