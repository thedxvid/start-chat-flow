
-- Etapa 1: Limpeza completa - remover triggers problemáticos
DROP TRIGGER IF EXISTS on_auth_user_created_link_admin ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remover funções SQL complexas que estão causando problemas
DROP FUNCTION IF EXISTS public.link_admin_record_to_user_v5();
DROP FUNCTION IF EXISTS public.handle_normal_user_signup();
DROP FUNCTION IF EXISTS public.create_user_admin_final(text, text, text, text, text);

-- Criar trigger simples apenas para usuários normais (não admins)
CREATE OR REPLACE FUNCTION public.handle_new_user_simple()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Apenas criar profile básico para usuários que se registram normalmente
  -- (não para usuários criados por admin via Edge Function)
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
    -- Em caso de erro, não bloquear a criação do usuário
    RAISE WARNING 'Erro ao criar profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Criar trigger mais simples que não causa conflitos
CREATE TRIGGER on_auth_user_created_simple
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_simple();
