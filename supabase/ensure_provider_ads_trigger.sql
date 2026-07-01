-- =========================================================================
-- SQL MIGRATION: AUTOMATICALLY ENSURE AD ROW EXISTS FOR EACH PROVIDER
-- =========================================================================

-- 1. Backfill default ads for existing providers who don't have one
INSERT INTO public.ads (profile_id, title, description, price, photos, is_active)
SELECT 
  p.id,
  'Atendimento com ' || p.name,
  COALESCE(p.bio, ''),
  p.price_per_hour,
  CASE WHEN p.avatar_url IS NOT NULL AND p.avatar_url <> '' THEN ARRAY[p.avatar_url] ELSE '{}'::text[] END,
  true
FROM public.profiles p
LEFT JOIN public.ads a ON a.profile_id = p.id
WHERE p.role = 'provider' AND a.id IS NULL
ON CONFLICT (profile_id) DO NOTHING;

-- 2. Create or replace the function to ensure ad exists on insert or update
CREATE OR REPLACE FUNCTION public.ensure_provider_ad_row()
RETURNS trigger AS $$
BEGIN
  IF NEW.role = 'provider' THEN
    -- Insert a default ad if it doesn't exist
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

-- 3. Create the trigger
DROP TRIGGER IF EXISTS tr_ensure_provider_ad ON public.profiles;
CREATE TRIGGER tr_ensure_provider_ad
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_provider_ad_row();
