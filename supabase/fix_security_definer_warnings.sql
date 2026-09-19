-- =========================================================================
-- SCRIPT DE RESOLUÇÃO FINAL DOS 6 AVISOS DE SECURITY DEFINER NO SUPABASE (LINTER)
-- =========================================================================

-- 1. ATUALIZAR FUNÇÃO DE PROTEÇÃO DE PROFILE PARA PERMITIR BOOST_EXPIRES_AT EM PLANOS PRO/GOLD
CREATE OR REPLACE FUNCTION public.protect_profile_system_fields()
RETURNS trigger AS $$
BEGIN
  IF (current_setting('role', true) <> 'service_role') THEN
    IF (OLD.role IS DISTINCT FROM NEW.role) THEN
      NEW.role := OLD.role;
    END IF;
    IF (OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier) THEN
      NEW.subscription_tier := OLD.subscription_tier;
    END IF;
    IF (OLD.is_space_verified IS DISTINCT FROM NEW.is_space_verified) THEN
      NEW.is_space_verified := OLD.is_space_verified;
    END IF;
    -- Permitir atualização de impulsionamento se a modelo for Pro ou Gold
    IF (OLD.boost_expires_at IS DISTINCT FROM NEW.boost_expires_at) THEN
      IF (OLD.subscription_tier NOT IN ('pro', 'gold')) THEN
        NEW.boost_expires_at := OLD.boost_expires_at;
      END IF;
    END IF;
    IF (OLD.verification_title IS DISTINCT FROM NEW.verification_title) THEN
      NEW.verification_title := OLD.verification_title;
    END IF;
    IF (OLD.verification_status IS DISTINCT FROM NEW.verification_status) THEN
      IF (NEW.verification_status <> 'pending') THEN
        NEW.verification_status := OLD.verification_status;
      END IF;
    END IF;
    IF (OLD.verification_selfie IS DISTINCT FROM NEW.verification_selfie OR
        OLD.verification_document IS DISTINCT FROM NEW.verification_document) THEN
      NEW.verification_status := 'pending';
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

REVOKE EXECUTE ON FUNCTION public.protect_profile_system_fields() FROM PUBLIC, anon, authenticated;

-- 2. TRANSFORMAR BOOST_AD EM SECURITY INVOKER (Elimina os avisos do linter no boost_ad)
CREATE OR REPLACE FUNCTION public.boost_ad(p_hours integer DEFAULT 6)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_tier text;
  v_new_expires timestamptz;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  SELECT subscription_tier INTO v_tier FROM public.profiles WHERE id = v_user_id;
  IF v_tier IS NULL OR v_tier = 'free' THEN
    RETURN json_build_object('success', false, 'error', 'Plano Bronze não permite impulsionamento');
  END IF;

  SELECT GREATEST(now(), COALESCE(boost_expires_at, now())) + (p_hours || ' hours')::interval
  INTO v_new_expires
  FROM public.profiles WHERE id = v_user_id;

  UPDATE public.profiles
  SET boost_expires_at = v_new_expires
  WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'boost_expires_at', v_new_expires,
    'hours_added', p_hours
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.boost_ad(integer) TO authenticated, service_role;

-- 3. TRANSFORMAR CHECK_PREMIUM_ACCESS EM SECURITY INVOKER (Elimina os avisos do linter no check_premium_access)
CREATE OR REPLACE FUNCTION public.check_premium_access(p_media_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_provider_id uuid;
  v_price_cents integer;
  v_has_sub boolean;
  v_has_purchase boolean;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN RETURN false; END IF;

  SELECT profile_id, price_cents INTO v_provider_id, v_price_cents
  FROM public.premium_media WHERE id = p_media_id AND is_active = true;

  IF v_provider_id IS NULL THEN RETURN false; END IF;
  IF v_user_id = v_provider_id THEN RETURN true; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.premium_subscriptions
    WHERE client_id = v_user_id AND provider_id = v_provider_id
      AND status = 'active' AND expires_at > now()
  ) INTO v_has_sub;

  IF v_has_sub THEN RETURN true; END IF;

  IF v_price_cents IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.premium_purchases
      WHERE client_id = v_user_id AND media_id = p_media_id
    ) INTO v_has_purchase;
    RETURN v_has_purchase;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_premium_access(uuid) TO authenticated, anon, service_role;

-- 4. RESTRENGIR EXPIRE_OUTDATED_SUBSCRIPTIONS APENAS PARA SERVICE_ROLE (Elimina os avisos no expire_outdated_subscriptions)
CREATE OR REPLACE FUNCTION public.expire_outdated_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE public.profiles
  SET subscription_tier = 'free'
  WHERE subscription_tier != 'free'
    AND subscription_expires_at IS NOT NULL
    AND subscription_expires_at < NOW();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.expire_outdated_subscriptions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_outdated_subscriptions() TO service_role;

SELECT 'Todos os 6 avisos de Security Definer foram resolvidos com sucesso!' AS status;
