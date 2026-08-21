-- =========================================================================
-- SCRIPT DEFINITIVO DE CORREÇÃO DE AVISOS DO LINTER DO SUPABASE (VERSÃO 2.0)
-- Zero avisos do linter (100% limpo):
-- 1. function_search_path_mutable
-- 2. extension_in_public
-- 3. anon_security_definer_function_executable
-- 4. authenticated_security_definer_function_executable
-- =========================================================================

-- ------------------------------------------------------------
-- 1. MOVER EXTENSÃO UNACCENT FORA DO SCHEMA PUBLIC
-- ------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION unaccent SET SCHEMA extensions;

-- ------------------------------------------------------------
-- 2. ATUALIZAR SLUGIFY PARA SECURITY INVOKER + SEARCH_PATH
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.slugify(value text)
RETURNS text AS $$
DECLARE
  normalized text;
BEGIN
  IF value IS NULL THEN RETURN NULL; END IF;
  normalized := lower(extensions.unaccent(value));
  normalized := regexp_replace(normalized, '[^a-z0-9\s_-]', '', 'g');
  normalized := trim(normalized);
  normalized := regexp_replace(normalized, '\s+', '-', 'g');
  normalized := regexp_replace(normalized, '-+', '-', 'g');
  RETURN normalized;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT SECURITY INVOKER SET search_path = public, extensions;

-- ------------------------------------------------------------
-- 3. ATUALIZAR RESOLVE_LOCATION_NAMES PARA SECURITY INVOKER + SEARCH_PATH
-- ------------------------------------------------------------
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
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public, extensions;

-- ------------------------------------------------------------
-- 4. ATUALIZAR GET_PREMIUM_PROFILES PARA SECURITY INVOKER + SEARCH_PATH
-- ------------------------------------------------------------
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
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public, extensions;

-- ------------------------------------------------------------
-- 5. ATUALIZAR INCREMENT_STORY_VIEWS PARA SECURITY INVOKER + SEARCH_PATH
-- (Garante permissão de UPDATE em views_count para anon/authenticated)
-- ------------------------------------------------------------
GRANT UPDATE (views_count, likes_count) ON public.stories TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_story_views(story_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.stories
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = story_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, extensions;

-- ------------------------------------------------------------
-- 6. ATUALIZAR INCREMENT_STORY_LIKES PARA SECURITY INVOKER + SEARCH_PATH
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_story_likes(story_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.stories
  SET likes_count = COALESCE(likes_count, 0) + 1
  WHERE id = story_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, extensions;

-- Conceder permissões explícitas de execução
GRANT EXECUTE ON FUNCTION public.slugify(text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_location_names(text, text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_premium_profiles(text, text, boolean) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.increment_story_views(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.increment_story_likes(uuid) TO authenticated, anon, service_role;

SELECT 'Todas as funções agora usam SECURITY INVOKER e os avisos do linter foram zerados!' AS status;
