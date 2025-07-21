-- Remover manualmente o usuário problemático que está causando erro de chave duplicada
-- Primeiro limpar todas as referências
DELETE FROM subscriptions WHERE customer_email = 'davicastropx@gmail.com';
DELETE FROM user_roles WHERE user_id = 'bd206935-3f54-4d58-b384-20767c81b1f2';
DELETE FROM profiles WHERE user_id = 'bd206935-3f54-4d58-b384-20767c81b1f2' OR admin_email = 'davicastropx@gmail.com';
DELETE FROM conversations WHERE user_id = 'bd206935-3f54-4d58-b384-20767c81b1f2';

-- Nota: auth.users será removido via Edge Function pois não podemos fazer DELETE direto nela