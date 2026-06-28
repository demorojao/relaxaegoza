-- =========================================================================
-- OPTIMIZATION SCRIPT: LOCATION SEARCH INDEXES & RPC GET_PREMIUM_PROFILES
-- =========================================================================

-- Enable unaccent extension for slugification
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 1. Create a robust IMMUTABLE slugify function in PostgreSQL that matches JS slugify
CREATE OR REPLACE FUNCTION public.slugify(value text)
RETURNS text AS $$
DECLARE
  normalized text;
BEGIN
  IF value IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove accents and convert to lowercase
  normalized := lower(public.unaccent(value));
  
  -- Remove characters that are not letters, digits, spaces, hyphens or underscores
  normalized := regexp_replace(normalized, '[^a-z0-9\s_-]', '', 'g');
  
  -- Trim edges
  normalized := trim(normalized);
  
  -- Replace multiple spaces with a single hyphen
  normalized := regexp_replace(normalized, '\s+', '-', 'g');
  
  -- Replace multiple hyphens with a single hyphen
  normalized := regexp_replace(normalized, '-+', '-', 'g');
  
  RETURN normalized;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT SET search_path = public;

-- 2. Create the composite expression index for extremely fast geographic queries
-- Note: 'state' is not in the database table schema. It is dynamically resolved 
-- in JS based on the city slug via CITY_TO_STATE_MAP. Therefore, we index 
-- the slugified city and neighborhood.
CREATE INDEX IF NOT EXISTS idx_profiles_location_slugs 
ON public.profiles (public.slugify(city), public.slugify(neighborhood)) 
WHERE role = 'provider';

-- 3. Create the RPC function to query profiles efficiently
CREATE OR REPLACE FUNCTION public.get_premium_profiles(
  p_city_slug text DEFAULT NULL,
  p_neighborhood_slug text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  WITH filtered_profiles AS (
    SELECT 
      p.id,
      p.name,
      p.age,
      p.city,
      p.price_per_hour,
      p.avatar_url,
      p.subscription_tier,
      p.is_available_now,
      p.available_until,
      p.created_at,
      p.is_space_verified,
      p.verification_status,
      p.neighborhood,
      p.latitude,
      p.longitude,
      p.category,
      p.amenities,
      p.gender,
      p.whatsapp,
      p.whatsapp_custom_message,
      p.boost_expires_at,
      -- Fetch and construct specialties JSON structure to match Supabase nested select format
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'specialties', json_build_object('name', s.name)
            )
          )
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
    ORDER BY 
      -- 1. Subscription Tier (gold > pro > free)
      CASE p.subscription_tier 
        WHEN 'gold' THEN 3
        WHEN 'pro' THEN 2
        ELSE 1
      END DESC,
      -- 2. Active Boost Status
      CASE 
        WHEN p.boost_expires_at > now() THEN 1 
        ELSE 0 
      END DESC,
      -- 3. Recency of Boost expiration (latest comes first)
      CASE 
        WHEN p.boost_expires_at > now() THEN p.boost_expires_at 
        ELSE NULL 
      END DESC NULLS LAST,
      -- 4. Availability ("Available Now" and not expired)
      CASE 
        WHEN p.is_available_now AND (p.available_until IS NULL OR p.available_until > now()) THEN 1 
        ELSE 0 
      END DESC,
      -- 5. Profile recency (newest profile first)
      p.created_at DESC
  )
  SELECT json_agg(to_jsonb(fp)) INTO result
  FROM filtered_profiles fp;

  -- Return empty array instead of null if no profiles found
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 4. Create RPC function to resolve original location casing (city/neighborhood) by slug
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

-- 5. RLS Policy Optimization (Avoid nested subquery per row in public SELECTs)
-- Old policy: USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_photos.profile_id AND role = 'provider') OR auth.uid() = profile_id)
-- Optimized policy: USING (true) since only providers have gallery photos and they are public.
DROP POLICY IF EXISTS "Fotos de perfis visíveis publicamente se provedor" ON public.profile_photos;
CREATE POLICY "Fotos de perfis visíveis publicamente" 
  ON public.profile_photos FOR SELECT 
  USING (true);


