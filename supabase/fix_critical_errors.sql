-- ==========================================
-- SCRIPT DE CORREÇÃO DE VULNERABILIDADES CRÍTICAS
-- ==========================================

-- 1. CORREÇÃO DE RLS UPDATE VULNERÁVEL (IDOR / Account Takeover)
-- Removemos a política antiga e recriamos com WITH CHECK
DROP POLICY IF EXISTS "Usuários atualizam o próprio perfil" ON public.profiles;
CREATE POLICY "Usuários atualizam o próprio perfil" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

-- 2. CORREÇÃO DE COLUMN TAMPERING (Auto-Promoção de Assinatura e Verificação)
-- Trigger para bloquear edição de campos sensíveis de Profiles por usuários finais
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS trigger AS $$
BEGIN
  -- Se a requisição vier via Data API (authenticated ou anon)
  IF current_user IN ('authenticated', 'anon') THEN
    -- Força as colunas sensíveis a manterem o valor antigo, ignorando a tentativa de update
    NEW.subscription_tier = OLD.subscription_tier;
    NEW.verification_status = OLD.verification_status;
    NEW.is_space_verified = OLD.is_space_verified;
    NEW.boost_expires_at = OLD.boost_expires_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_protect_sensitive_profile_fields ON public.profiles;
CREATE TRIGGER tr_protect_sensitive_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_profile_fields();

-- Trigger para bloquear edição do campo is_verified em profile_photos
CREATE OR REPLACE FUNCTION public.protect_sensitive_photo_fields()
RETURNS trigger AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.is_verified = OLD.is_verified;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_protect_sensitive_photo_fields ON public.profile_photos;
CREATE TRIGGER tr_protect_sensitive_photo_fields
  BEFORE UPDATE ON public.profile_photos
  FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_photo_fields();

-- Trigger para bloquear edição do campo is_verified_interaction em reviews
CREATE OR REPLACE FUNCTION public.protect_sensitive_review_fields()
RETURNS trigger AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.is_verified_interaction = OLD.is_verified_interaction;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_protect_sensitive_review_fields ON public.reviews;
CREATE TRIGGER tr_protect_sensitive_review_fields
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_review_fields();


-- 3. CORREÇÃO DE SECURITY DEFINER (Search Path Hijacking)
-- Atualizamos a função para definir o search_path de forma segura
CREATE OR REPLACE FUNCTION public.check_stories_limit()
RETURNS trigger AS $$
DECLARE
  user_tier text;
  stories_count integer;
BEGIN
  SELECT subscription_tier INTO user_tier 
  FROM public.profiles 
  WHERE id = NEW.profile_id;

  IF user_tier = 'free' OR user_tier IS NULL THEN
    RAISE EXCEPTION 'O plano Bronze (Grátis) não permite postar Stories. Faça upgrade para Pro ou Gold.';
  END IF;

  IF user_tier = 'pro' THEN
    SELECT COUNT(*) INTO stories_count 
    FROM public.stories 
    WHERE profile_id = NEW.profile_id 
      AND created_at > (timezone('utc'::text, now()) - interval '24 hours');
    
    IF stories_count >= 3 THEN
      RAISE EXCEPTION 'Limite atingido! Profissionais no plano Pro podem postar no máximo 3 stories a cada 24 horas.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 4. CORREÇÃO DE PERFORMANCE (Índices em Foreign Keys)
CREATE INDEX IF NOT EXISTS idx_profile_photos_profile_id ON public.profile_photos(profile_id);
CREATE INDEX IF NOT EXISTS idx_reviews_provider_id ON public.reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON public.reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_stories_profile_id ON public.stories(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_specialties_profile_id ON public.profile_specialties(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_specialties_specialty_id ON public.profile_specialties(specialty_id);

-- FIM DO SCRIPT
