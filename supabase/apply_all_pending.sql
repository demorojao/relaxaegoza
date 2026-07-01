-- ============================================================
-- SCRIPT UNIFICADO: TODAS AS PENDÊNCIAS DO BANCO
-- Relaxa & Goza — aplicar via: npx supabase db query --linked --file supabase/apply_all_pending.sql
-- ============================================================


-- ============================================================
-- 1. SEGURANÇA: SEARCH PATH MUTABLE NAS FUNÇÕES (CORRIGIDO COM ASSINATURAS CORRETAS)
-- ============================================================

-- Corrige get_premium_profiles (assinatura real: p_city_slug text, p_neighborhood_slug text, p_only_ads boolean)
REVOKE EXECUTE ON FUNCTION public.get_premium_profiles(text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_premium_profiles(text, text, boolean) TO authenticated, anon, service_role;

-- Corrige resolve_location_names (assinatura real: p_city_slug text, p_neighborhood_slug text)
REVOKE EXECUTE ON FUNCTION public.resolve_location_names(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_location_names(text, text) TO authenticated, anon, service_role;

-- Recriar funções de proteção com SET search_path = public
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS trigger AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.subscription_tier = OLD.subscription_tier;
    NEW.verification_status = OLD.verification_status;
    NEW.is_space_verified = OLD.is_space_verified;
    NEW.boost_expires_at = OLD.boost_expires_at;
    NEW.verification_title = OLD.verification_title;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.protect_sensitive_photo_fields()
RETURNS trigger AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.is_verified = OLD.is_verified;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.protect_sensitive_review_fields()
RETURNS trigger AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.is_verified_interaction = OLD.is_verified_interaction;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recriar triggers com as funções corrigidas
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


-- ============================================================
-- 2. RLS DE DELETE NA TABELA STORIES (necessário para botão excluir funcionar)
-- ============================================================

-- Garantir RLS habilitada na tabela stories
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Política de SELECT: público pode ver stories ativos de provedores
DROP POLICY IF EXISTS "Stories visíveis publicamente" ON public.stories;
CREATE POLICY "Stories visíveis publicamente"
  ON public.stories FOR SELECT
  USING (expires_at > now());

-- Política de INSERT: apenas o dono do perfil pode inserir
DROP POLICY IF EXISTS "Provedores inserem seus stories" ON public.stories;
CREATE POLICY "Provedores inserem seus stories"
  ON public.stories FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = profile_id);

-- Política de DELETE: apenas o dono do story pode deletar
DROP POLICY IF EXISTS "Provedores deletam seus stories" ON public.stories;
CREATE POLICY "Provedores deletam seus stories"
  ON public.stories FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = profile_id);

-- Política de UPDATE: apenas o dono pode atualizar
DROP POLICY IF EXISTS "Provedores atualizam seus stories" ON public.stories;
CREATE POLICY "Provedores atualizam seus stories"
  ON public.stories FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = profile_id)
  WITH CHECK ((SELECT auth.uid()) = profile_id);


-- ============================================================
-- 3. RPC BOOST_AD — Impulsionamento de anúncios
-- ============================================================

CREATE OR REPLACE FUNCTION public.boost_ad(p_hours integer DEFAULT 6)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_tier text;
  v_new_expires timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- Verificar plano (apenas pro e gold podem boostar)
  SELECT subscription_tier INTO v_tier FROM public.profiles WHERE id = v_user_id;
  IF v_tier IS NULL OR v_tier = 'free' THEN
    RETURN json_build_object('success', false, 'error', 'Plano Bronze não permite impulsionamento');
  END IF;

  -- Calcular nova expiração (estende se já tiver boost ativo)
  SELECT GREATEST(now(), COALESCE(boost_expires_at, now())) + (p_hours || ' hours')::interval
  INTO v_new_expires
  FROM public.profiles WHERE id = v_user_id;

  -- Atualizar diretamente com UPDATE privilegiado (SECURITY DEFINER ignora o trigger de proteção)
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

-- Garantir permissões na RPC
REVOKE EXECUTE ON FUNCTION public.boost_ad(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.boost_ad(integer) TO authenticated;


-- ============================================================
-- 4. TABELAS DE CONTEÚDO EXCLUSIVO (PPV / Assinaturas)
-- ============================================================

-- Tabela de mídias premium (fotos e vídeos bloqueados)
CREATE TABLE IF NOT EXISTS public.premium_media (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title varchar(150),
  description text,
  price_cents integer, -- null = apenas via assinatura; valor = PPV
  media_url varchar(500) NOT NULL, -- path no bucket privado (não URL pública)
  preview_url varchar(500),        -- miniatura borrada no bucket público
  media_type varchar(10) NOT NULL DEFAULT 'photo' CHECK (media_type IN ('photo', 'video')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de assinaturas ativas (cliente assina o canal de uma modelo)
CREATE TABLE IF NOT EXISTS public.premium_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, provider_id)
);

-- Tabela de compras avulsas (PPV)
CREATE TABLE IF NOT EXISTS public.premium_purchases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES public.premium_media(id) ON DELETE CASCADE,
  amount_paid_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, media_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_premium_media_profile ON public.premium_media(profile_id);
CREATE INDEX IF NOT EXISTS idx_premium_subs_client ON public.premium_subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_premium_subs_provider ON public.premium_subscriptions(provider_id);
CREATE INDEX IF NOT EXISTS idx_premium_purchases_client ON public.premium_purchases(client_id);

-- Habilitar RLS
ALTER TABLE public.premium_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_purchases ENABLE ROW LEVEL SECURITY;

-- RLS premium_media: qualquer um pode ver lista (mas não acessar a mídia real sem permissão)
DROP POLICY IF EXISTS "Premium media visível para todos" ON public.premium_media;
CREATE POLICY "Premium media visível para todos"
  ON public.premium_media FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Provedores gerenciam suas mídias premium" ON public.premium_media;
CREATE POLICY "Provedores gerenciam suas mídias premium"
  ON public.premium_media FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = profile_id)
  WITH CHECK ((SELECT auth.uid()) = profile_id);

-- RLS premium_subscriptions: cliente vê suas assinaturas, provedor vê seus assinantes
DROP POLICY IF EXISTS "Clientes veem suas assinaturas" ON public.premium_subscriptions;
CREATE POLICY "Clientes veem suas assinaturas"
  ON public.premium_subscriptions FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = client_id
    OR (SELECT auth.uid()) = provider_id
  );

DROP POLICY IF EXISTS "Clientes inserem assinaturas" ON public.premium_subscriptions;
CREATE POLICY "Clientes inserem assinaturas"
  ON public.premium_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = client_id);

-- RLS premium_purchases: cliente vê suas compras
DROP POLICY IF EXISTS "Clientes veem suas compras" ON public.premium_purchases;
CREATE POLICY "Clientes veem suas compras"
  ON public.premium_purchases FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = client_id);

DROP POLICY IF EXISTS "Clientes inserem compras" ON public.premium_purchases;
CREATE POLICY "Clientes inserem compras"
  ON public.premium_purchases FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = client_id);


-- ============================================================
-- 5. RPC PARA VERIFICAR ACESSO A MÍDIA PREMIUM
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_premium_access(p_media_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_provider_id uuid;
  v_price_cents integer;
  v_has_sub boolean;
  v_has_purchase boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN false; END IF;

  SELECT profile_id, price_cents INTO v_provider_id, v_price_cents
  FROM public.premium_media WHERE id = p_media_id AND is_active = true;

  IF v_provider_id IS NULL THEN RETURN false; END IF;

  -- Dono da mídia tem acesso
  IF v_user_id = v_provider_id THEN RETURN true; END IF;

  -- Verificar assinatura ativa
  SELECT EXISTS(
    SELECT 1 FROM public.premium_subscriptions
    WHERE client_id = v_user_id AND provider_id = v_provider_id
      AND status = 'active' AND expires_at > now()
  ) INTO v_has_sub;

  IF v_has_sub THEN RETURN true; END IF;

  -- Se é PPV, verificar compra
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

REVOKE EXECUTE ON FUNCTION public.check_premium_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_premium_access(uuid) TO authenticated;


-- ============================================================
-- 6. COLUNA subscription_price NA TABELA PROFILES (para assinaturas dos canais das modelos)
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_price_cents integer DEFAULT 0;

SELECT 'apply_all_pending.sql executado com sucesso!' AS status;
