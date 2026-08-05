-- =========================================================================
-- SCRIPT TOTAL DE SEGURANÇA E RESOLUÇÃO DE ALERTAS DO LINTER (SUPABASE)
-- Resolução de avisos: Search Path Hijacking, RLS WITH CHECK, Foreign Key Indexes,
-- Revogação de funções internas de trigger e Políticas de Storage.
-- Executar via SQL Editor no Supabase Dashboard
-- =========================================================================

-- ------------------------------------------------------------
-- 1. CORREÇÃO DE POLÍTICA DE BUCKET PÚBLICO (public_bucket_allows_listing)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Leitura pública do profile_media" ON storage.objects;

-- ------------------------------------------------------------
-- 2. CORREÇÃO DE SEGURANÇA EM TODAS AS FUNÇÕES (SET search_path = public)
-- E AJUSTE DE SECURITY DEFINER / INVOKER
-- ------------------------------------------------------------

-- Função slugify
CREATE OR REPLACE FUNCTION public.slugify(value text)
RETURNS text AS $$
DECLARE
  normalized text;
BEGIN
  IF value IS NULL THEN RETURN NULL; END IF;
  normalized := lower(public.unaccent(value));
  normalized := regexp_replace(normalized, '[^a-z0-9\s_-]', '', 'g');
  normalized := trim(normalized);
  normalized := regexp_replace(normalized, '\s+', '-', 'g');
  normalized := regexp_replace(normalized, '-+', '-', 'g');
  RETURN normalized;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT SECURITY DEFINER SET search_path = public;

-- Função handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, name, role, age, city, price_per_hour, whatsapp, neighborhood, subscription_tier, latitude, longitude
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'Usuário'),
    COALESCE(new.raw_user_meta_data->>'role', 'client'),
    COALESCE((new.raw_user_meta_data->>'age')::integer, 18),
    COALESCE(new.raw_user_meta_data->>'city', 'São Paulo'),
    COALESCE((new.raw_user_meta_data->>'price_per_hour')::numeric, 0),
    COALESCE(new.raw_user_meta_data->>'whatsapp', ''),
    COALESCE(new.raw_user_meta_data->>'neighborhood', ''),
    'free',
    COALESCE((new.raw_user_meta_data->>'latitude')::numeric, -23.56 + (random() - 0.5) * 0.08),
    COALESCE((new.raw_user_meta_data->>'longitude')::numeric, -46.65 + (random() - 0.5) * 0.08)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função protect_sensitive_profile_fields
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS trigger AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') OR (current_setting('role', true) <> 'service_role') THEN
    IF (OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier) THEN
      NEW.subscription_tier := OLD.subscription_tier;
    END IF;
    IF (OLD.role IS DISTINCT FROM NEW.role) THEN
      NEW.role := OLD.role;
    END IF;
    IF (OLD.is_space_verified IS DISTINCT FROM NEW.is_space_verified) THEN
      NEW.is_space_verified := OLD.is_space_verified;
    END IF;
    IF (OLD.boost_expires_at IS DISTINCT FROM NEW.boost_expires_at) THEN
      NEW.boost_expires_at := OLD.boost_expires_at;
    END IF;
    IF (OLD.verification_status IS DISTINCT FROM NEW.verification_status) THEN
      IF (NEW.verification_status <> 'pending') THEN
        NEW.verification_status := OLD.verification_status;
      END IF;
    END IF;
    IF (OLD.verification_status = 'verified' AND (
        OLD.name IS DISTINCT FROM NEW.name OR 
        OLD.age IS DISTINCT FROM NEW.age OR 
        OLD.avatar_url IS DISTINCT FROM NEW.avatar_url
    )) THEN
      NEW.verification_status := 'pending';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função protect_profile_system_fields
CREATE OR REPLACE FUNCTION public.protect_profile_system_fields()
RETURNS trigger AS $$
BEGIN
  RETURN public.protect_sensitive_profile_fields();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função protect_sensitive_photo_fields
CREATE OR REPLACE FUNCTION public.protect_sensitive_photo_fields()
RETURNS trigger AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') OR (current_setting('role', true) <> 'service_role') THEN
    NEW.is_verified := OLD.is_verified;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função protect_sensitive_review_fields
CREATE OR REPLACE FUNCTION public.protect_sensitive_review_fields()
RETURNS trigger AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') OR (current_setting('role', true) <> 'service_role') THEN
    NEW.is_verified_interaction := OLD.is_verified_interaction;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função check_stories_limit
CREATE OR REPLACE FUNCTION public.check_stories_limit()
RETURNS trigger AS $$
DECLARE
  user_tier text;
  stories_count integer;
BEGIN
  SELECT subscription_tier INTO user_tier FROM public.profiles WHERE id = NEW.profile_id;
  IF user_tier = 'free' OR user_tier IS NULL THEN
    RAISE EXCEPTION 'O plano Bronze (Grátis) não permite postar Stories. Faça upgrade para Pro ou Gold.';
  END IF;
  IF user_tier = 'pro' THEN
    SELECT COUNT(*) INTO stories_count FROM public.stories 
    WHERE profile_id = NEW.profile_id AND created_at > (timezone('utc'::text, now()) - interval '24 hours');
    IF stories_count >= 3 THEN
      RAISE EXCEPTION 'Limite atingido! Profissionais no plano Pro podem postar no máximo 3 stories a cada 24 horas.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função ensure_provider_ad_row
CREATE OR REPLACE FUNCTION public.ensure_provider_ad_row()
RETURNS trigger AS $$
BEGIN
  IF NEW.role = 'provider' THEN
    INSERT INTO public.ads (profile_id, title, description, price, photos, is_active)
    VALUES (
      NEW.id,
      'Atendimento com ' || COALESCE(NEW.name, 'Provedora'),
      COALESCE(NEW.bio, ''),
      COALESCE(NEW.price_per_hour, 0),
      CASE WHEN NEW.avatar_url IS NOT NULL AND NEW.avatar_url <> '' THEN ARRAY[NEW.avatar_url] ELSE '{}'::text[] END,
      true
    )
    ON CONFLICT (profile_id) DO UPDATE
    SET 
      title = CASE 
        WHEN (ads.title IS NULL OR ads.title = '' OR ads.title = 'Atendimento com ' || COALESCE(OLD.name, 'Provedora')) 
        THEN 'Atendimento com ' || COALESCE(NEW.name, 'Provedora') 
        ELSE ads.title 
      END,
      price = CASE 
        WHEN ads.price = COALESCE(OLD.price_per_hour, 0) 
        THEN COALESCE(NEW.price_per_hour, 0) 
        ELSE ads.price 
      END,
      photos = CASE 
        WHEN (ads.photos IS NULL OR ads.photos = '{}'::text[]) AND NEW.avatar_url IS NOT NULL AND NEW.avatar_url <> '' 
        THEN ARRAY[NEW.avatar_url] 
        ELSE ads.photos 
      END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função check_ad_media_limits
CREATE OR REPLACE FUNCTION public.check_ad_media_limits()
RETURNS trigger AS $$
DECLARE
  user_tier text;
  max_photos integer;
  max_videos integer;
  photos_count integer := 0;
  videos_count integer := 0;
BEGIN
  SELECT subscription_tier INTO user_tier FROM public.profiles WHERE id = NEW.profile_id;
  IF user_tier = 'gold' THEN max_photos := 20; max_videos := 15;
  ELSIF user_tier = 'pro' THEN max_photos := 10; max_videos := 10;
  ELSE max_photos := 3; max_videos := 0;
  END IF;
  IF NEW.photos IS NOT NULL THEN photos_count := COALESCE(array_length(NEW.photos, 1), 0); END IF;
  IF NEW.videos IS NOT NULL THEN videos_count := COALESCE(array_length(NEW.videos, 1), 0); END IF;
  IF photos_count > max_photos THEN RAISE EXCEPTION 'Seu plano permite no máximo % fotos no anúncio (enviado: %).', max_photos, photos_count; END IF;
  IF videos_count > max_videos THEN RAISE EXCEPTION 'Seu plano permite no máximo % vídeos no anúncio (enviado: %).', max_videos, videos_count; END IF;
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC: get_premium_profiles (Assinatura única sem conflitos de sobrecarga PGRST203)
DROP FUNCTION IF EXISTS public.get_premium_profiles(text, text);
DROP FUNCTION IF EXISTS public.get_premium_profiles(text, text, boolean);

CREATE OR REPLACE FUNCTION public.get_premium_profiles(
  p_city_slug text DEFAULT NULL,
  p_neighborhood_slug text DEFAULT NULL,
  p_only_ads boolean DEFAULT FALSE
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  WITH filtered_profiles AS (
    SELECT 
      p.id, p.name, p.age, p.city, p.price_per_hour, p.avatar_url, p.subscription_tier,
      p.is_available_now, p.available_until, p.created_at, p.is_space_verified,
      p.verification_status, p.neighborhood, p.latitude, p.longitude, p.category,
      p.amenities, p.gender, p.whatsapp, p.whatsapp_custom_message, p.boost_expires_at,
      COALESCE(
        (
          SELECT json_agg(json_build_object('specialties', json_build_object('name', s.name)))
          FROM public.profile_specialties ps
          JOIN public.specialties s ON s.id = ps.specialty_id
          WHERE ps.profile_id = p.id
        ),
        '[]'::json
      ) AS specialties
    FROM public.profiles p
    WHERE p.role = 'provider'
      AND p.avatar_url IS NOT NULL AND p.avatar_url <> ''
      AND (p_city_slug IS NULL OR public.slugify(p.city) = p_city_slug)
      AND (p_neighborhood_slug IS NULL OR public.slugify(p.neighborhood) = p_neighborhood_slug)
      AND (NOT p_only_ads OR EXISTS (SELECT 1 FROM public.ads a WHERE a.profile_id = p.id AND a.is_active = true))
    ORDER BY 
      CASE p.subscription_tier WHEN 'gold' THEN 3 WHEN 'pro' THEN 2 ELSE 1 END DESC,
      CASE WHEN p.boost_expires_at > now() THEN 1 ELSE 0 END DESC,
      CASE WHEN p.boost_expires_at > now() THEN p.boost_expires_at ELSE NULL END DESC NULLS LAST,
      CASE WHEN p.is_available_now AND (p.available_until IS NULL OR p.available_until > now()) THEN 1 ELSE 0 END DESC,
      p.created_at DESC
  )
  SELECT json_agg(to_jsonb(fp)) INTO result FROM filtered_profiles fp;
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- RPC: resolve_location_names
CREATE OR REPLACE FUNCTION public.resolve_location_names(
  p_city_slug text,
  p_neighborhood_slug text DEFAULT NULL
)
RETURNS TABLE (city text, neighborhood text) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.city, p.neighborhood
  FROM public.profiles p
  WHERE p.role = 'provider'
    AND public.slugify(p.city) = p_city_slug
    AND (p_neighborhood_slug IS NULL OR public.slugify(p.neighborhood) = p_neighborhood_slug)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------
-- 3. REVOGAR EXECUÇÃO DE FUNÇÕES DE TRIGGER INTERNAS DO ACESSO PÚBLICO
-- (Resolve avisos de "Public can execute function")
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_sensitive_profile_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_system_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_sensitive_photo_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_sensitive_review_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_stories_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_provider_ad_row() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_ad_media_limits() FROM PUBLIC, anon, authenticated;

-- Conceder execução nas RPCs públicas apenas para as roles autorizadas
GRANT EXECUTE ON FUNCTION public.get_premium_profiles(text, text, boolean) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_location_names(text, text) TO authenticated, anon, service_role;

-- ------------------------------------------------------------
-- 4. GARANTIR QUE TODAS AS POLÍTICAS RLS DE UPDATE POSSUEM WITH CHECK
-- ------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários atualizam o próprio perfil" ON public.profiles;
CREATE POLICY "Usuários atualizam o próprio perfil" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

ALTER TABLE public.profile_specialties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Provedores atualizam suas especialidades" ON public.profile_specialties;
CREATE POLICY "Provedores atualizam suas especialidades" 
  ON public.profile_specialties FOR UPDATE 
  USING (auth.uid() = profile_id) 
  WITH CHECK (auth.uid() = profile_id);

ALTER TABLE public.profile_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Provedores atualizam suas fotos" ON public.profile_photos;
CREATE POLICY "Provedores atualizam suas fotos" 
  ON public.profile_photos FOR UPDATE 
  USING (auth.uid() = profile_id) 
  WITH CHECK (auth.uid() = profile_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Clientes atualizam suas próprias reviews" ON public.reviews;
CREATE POLICY "Clientes atualizam suas próprias reviews" 
  ON public.reviews FOR UPDATE 
  USING (auth.uid() = client_id) 
  WITH CHECK (auth.uid() = client_id);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Provedores atualizam seus próprios stories" ON public.stories;
CREATE POLICY "Provedores atualizam seus próprios stories" 
  ON public.stories FOR UPDATE 
  USING (auth.uid() = profile_id) 
  WITH CHECK (auth.uid() = profile_id);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários gerenciam seus próprios ads" ON public.ads;
CREATE POLICY "Usuários gerenciam seus próprios ads" 
  ON public.ads FOR ALL 
  USING (auth.uid() = profile_id) 
  WITH CHECK (auth.uid() = profile_id);

-- ------------------------------------------------------------
-- 5. ÍNDICES DE PERFORMANCE PARA TODAS AS FOREIGN KEYS
-- (Evita Full Table Scans durante exclusões e garante respostas ultra rápidas)
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profile_photos_profile_id ON public.profile_photos(profile_id);
CREATE INDEX IF NOT EXISTS idx_reviews_provider_id ON public.reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON public.reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_stories_profile_id ON public.stories(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_specialties_profile_id ON public.profile_specialties(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_specialties_specialty_id ON public.profile_specialties(specialty_id);
CREATE INDEX IF NOT EXISTS idx_ads_profile_id ON public.ads(profile_id);
CREATE INDEX IF NOT EXISTS idx_profiles_location_slugs ON public.profiles (public.slugify(city), public.slugify(neighborhood)) WHERE role = 'provider';

SELECT 'Todos os avisos do linter e proteções do Supabase foram resolvidos com sucesso!' AS status;
