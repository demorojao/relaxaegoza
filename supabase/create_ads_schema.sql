-- =========================================================================
-- SQL MIGRATION: CREATE ADS TABLE, PLAN-BASED TRIGGERS AND RPC UPDATE
-- =========================================================================

-- 1. Create the ads table
CREATE TABLE IF NOT EXISTS public.ads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  photos text[] DEFAULT '{}'::text[],
  videos text[] DEFAULT '{}'::text[],
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS Policies
DROP POLICY IF EXISTS "Ads visíveis publicamente" ON public.ads;
CREATE POLICY "Ads visíveis publicamente" ON public.ads
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Usuários gerenciam seus próprios ads" ON public.ads;
CREATE POLICY "Usuários gerenciam seus próprios ads" ON public.ads
  FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

-- 3. Trigger to validate plan-based media limits
CREATE OR REPLACE FUNCTION public.check_ad_media_limits()
RETURNS trigger AS $$
DECLARE
  user_tier text;
  max_photos integer;
  max_videos integer;
  photos_count integer := 0;
  videos_count integer := 0;
BEGIN
  -- Get subscription tier from profile
  SELECT subscription_tier INTO user_tier 
  FROM public.profiles 
  WHERE id = NEW.profile_id;

  IF user_tier = 'gold' THEN
    max_photos := 20;
    max_videos := 15;
  ELSIF user_tier = 'pro' THEN
    max_photos := 10;
    max_videos := 10;
  ELSE
    max_photos := 3;
    max_videos := 0;
  END IF;

  -- Calculate lengths safely
  IF NEW.photos IS NOT NULL THEN
    photos_count := array_length(NEW.photos, 1);
    IF photos_count IS NULL THEN
      photos_count := 0;
    END IF;
  END IF;

  IF NEW.videos IS NOT NULL THEN
    videos_count := array_length(NEW.videos, 1);
    IF videos_count IS NULL THEN
      videos_count := 0;
    END IF;
  END IF;

  IF photos_count > max_photos THEN
    RAISE EXCEPTION 'Seu plano permite no máximo % fotos no anúncio (enviado: %).', max_photos, photos_count;
  END IF;

  IF videos_count > max_videos THEN
    RAISE EXCEPTION 'Seu plano permite no máximo % vídeos no anúncio (enviado: %).', max_videos, videos_count;
  END IF;

  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_check_ad_media_limits ON public.ads;
CREATE TRIGGER tr_check_ad_media_limits
  BEFORE INSERT OR UPDATE ON public.ads
  FOR EACH ROW EXECUTE FUNCTION public.check_ad_media_limits();

-- 4. Update profiles trigger to reset verification_status on avatar change
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS trigger AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.subscription_tier = OLD.subscription_tier;
    IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
      NEW.verification_status = 'none';
    ELSE
      NEW.verification_status = OLD.verification_status;
    END IF;
    NEW.is_space_verified = OLD.is_space_verified;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Update public.get_premium_profiles RPC function
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
    INNER JOIN public.ads a ON a.profile_id = p.id
    WHERE p.role = 'provider'
      AND a.is_active = true
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
