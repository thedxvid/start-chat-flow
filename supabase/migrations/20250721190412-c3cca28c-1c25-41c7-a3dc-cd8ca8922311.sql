-- Limpar registros administrativos duplicados ou problemáticos
DELETE FROM profiles 
WHERE admin_email = 'davicastropx@gmail.com' 
  AND is_admin_created = true 
  AND user_id IS NULL;

-- Limpar user_roles e subscriptions relacionados também se existirem
DELETE FROM user_roles 
WHERE user_id NOT IN (SELECT id FROM auth.users)
  AND user_id IN (
    SELECT temp_id FROM profiles 
    WHERE admin_email = 'davicastropx@gmail.com' 
      AND is_admin_created = true
  );

DELETE FROM subscriptions 
WHERE customer_email = 'davicastropx@gmail.com' 
  AND user_id IS NULL;