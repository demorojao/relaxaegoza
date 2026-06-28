-- Drop existing functions to avoid overload signature conflicts
DROP FUNCTION IF EXISTS public.get_premium_profiles(text, text);
DROP FUNCTION IF EXISTS public.get_premium_profiles(text, text, boolean);

-- Re-create the function with the new p_only_ads parameter
CREATE OR REPLACE FUNCTION public.get_premium_profiles(
  p_city_slug text DEFAULT NULL,
  p_neighborhood_slug text DEFAULT NULL,
  p_only_ads boolean DEFAULT true
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
      -- Ad fields
      a.title AS ad_title,
      a.description AS ad_description,
      a.price AS ad_price,
      a.photos AS ad_photos,
      a.videos AS ad_videos,
      -- Specialties
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
    LEFT JOIN public.ads a ON a.profile_id = p.id
    WHERE p.role = 'provider'
      AND p.avatar_url IS NOT NULL AND p.avatar_url <> ''
      -- Filter ads if p_only_ads is true, otherwise return all profiles with or without ads
      AND (NOT p_only_ads OR (a.is_active = true AND a.id IS NOT NULL))
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
