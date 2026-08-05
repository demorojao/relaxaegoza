-- ============================================================
-- SCRIPT DE CORREÇÃO DE SAVE DE PERFIL E TRIGGERS (RELAXA & GOZA)
-- Correção de erros ao salvar o perfil, localização e triggers no Supabase
-- Executar via SQL Editor no Supabase Dashboard ou CLI
-- ============================================================

-- 1. Garantir que todas as colunas necessárias existam na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_custom_message text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text DEFAULT 'Feminino' CHECK (gender IN ('Feminino', 'Masculino', 'Trans'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS category text DEFAULT 'massage' CHECK (category IN ('massage', 'escort', 'both'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_audience text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS amenities text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_hours jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rates jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS boost_expires_at timestamp with time zone;

-- 2. Recriar a função protect_sensitive_profile_fields sem referências a colunas inexistentes (como verification_title ou space_verification_file)
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS trigger AS $$
BEGIN
  -- Se o usuário atual for autenticado ou anônimo (cliente via Data API SDK)
  IF current_user IN ('authenticated', 'anon') OR (current_setting('role', true) <> 'service_role') THEN
    -- Impedir alteração direta de subscription_tier
    IF (OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier) THEN
      NEW.subscription_tier := OLD.subscription_tier;
    END IF;

    -- Impedir alteração direta do papel (role)
    IF (OLD.role IS DISTINCT FROM NEW.role) THEN
      NEW.role := OLD.role;
    END IF;

    -- Impedir alteração direta do selo de espaço físico
    IF (OLD.is_space_verified IS DISTINCT FROM NEW.is_space_verified) THEN
      NEW.is_space_verified := OLD.is_space_verified;
    END IF;

    -- Impedir alteração direta do boost
    IF (OLD.boost_expires_at IS DISTINCT FROM NEW.boost_expires_at) THEN
      NEW.boost_expires_at := OLD.boost_expires_at;
    END IF;

    -- Impedir auto-aprovação do status de verificação de identidade
    IF (OLD.verification_status IS DISTINCT FROM NEW.verification_status) THEN
      IF (NEW.verification_status <> 'pending') THEN
        NEW.verification_status := OLD.verification_status;
      END IF;
    END IF;

    -- Se o usuário mudar o nome, idade ou avatar_url e já estiver verificado, rebaixa o status para 'pending' para re-auditoria
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

-- Standardizar protect_profile_system_fields para chamar protect_sensitive_profile_fields
CREATE OR REPLACE FUNCTION public.protect_profile_system_fields()
RETURNS trigger AS $$
BEGIN
  RETURN public.protect_sensitive_profile_fields();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Limpar e re-associar triggers na tabela public.profiles
DROP TRIGGER IF EXISTS tr_protect_sensitive_profile_fields ON public.profiles;
DROP TRIGGER IF EXISTS before_profile_update ON public.profiles;

CREATE TRIGGER before_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_profile_fields();

-- 4. Garantir RLS de UPDATE na tabela profiles com permissões corretas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários atualizam o próprio perfil" ON public.profiles;
CREATE POLICY "Usuários atualizam o próprio perfil" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários leem o próprio perfil" ON public.profiles;
CREATE POLICY "Usuários leem o próprio perfil" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id OR role = 'provider');

-- 5. Atualizar função ensure_provider_ad_row para não falhar ao criar ou atualizar anúncios automaticamente
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

DROP TRIGGER IF EXISTS tr_ensure_provider_ad ON public.profiles;
CREATE TRIGGER tr_ensure_provider_ad
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_provider_ad_row();

SELECT 'fix_profile_save_and_triggers.sql executado com sucesso!' AS status;
