-- ============================================================
-- SCRIPT DE CORREÇÃO DE SEGURANÇA E ALERTAS DO LINTER (SECURITY ADVISORS)
-- ============================================================

-- 1. CORREÇÃO DE "Function Search Path Mutable"
-- Definir explicitamente o search_path como 'public' nas funções de trigger para evitar sequestro de caminho de busca (Search Path Hijacking).

-- Função: protect_sensitive_profile_fields
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS trigger AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.subscription_tier = OLD.subscription_tier;
    NEW.verification_status = OLD.verification_status;
    NEW.is_space_verified = OLD.is_space_verified;
    NEW.boost_expires_at = OLD.boost_expires_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função: protect_sensitive_photo_fields
CREATE OR REPLACE FUNCTION public.protect_sensitive_photo_fields()
RETURNS trigger AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.is_verified = OLD.is_verified;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função: protect_sensitive_review_fields
CREATE OR REPLACE FUNCTION public.protect_sensitive_review_fields()
RETURNS trigger AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.is_verified_interaction = OLD.is_verified_interaction;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 2. CORREÇÃO DE "Public Can Execute SECURITY DEFINER"
-- Revoga o privilégio implícito de execução de PUBLIC na função get_premium_profiles
-- e concede explicitamente apenas às roles autorizadas (incluindo o cliente anônimo e autenticado do app).

REVOKE EXECUTE ON FUNCTION public.get_premium_profiles(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_premium_profiles(text, text) TO authenticated, anon, service_role;

-- Revoga e concede também para resolve_location_names por segurança extra
REVOKE EXECUTE ON FUNCTION public.resolve_location_names(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_location_names(text, text) TO authenticated, anon, service_role;


-- 3. RESOLUÇÃO DOS TRIGGERS
-- Garante que todos os triggers usam as funções recriadas com search_path seguro
DROP TRIGGER IF EXISTS tr_protect_sensitive_profile_fields ON public.profiles;
CREATE TRIGGER tr_protect_sensitive_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_profile_fields();

DROP TRIGGER IF EXISTS tr_protect_sensitive_photo_fields ON public.profile_photos;
CREATE TRIGGER tr_protect_sensitive_photo_fields
  BEFORE UPDATE ON public.profile_photos
  FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_photo_fields();

DROP TRIGGER IF EXISTS tr_protect_sensitive_review_fields ON public.reviews;
CREATE TRIGGER tr_protect_sensitive_review_fields
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_review_fields();
