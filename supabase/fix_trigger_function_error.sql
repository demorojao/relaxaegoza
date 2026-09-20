-- ============================================================
-- SCRIPT DE CORREÇÃO DEFINITIVA DO ERRO DE TRIGGER EM PROFILES
-- Erro original: "trigger functions can only be called as triggers"
-- Executar via SQL Editor no Supabase Dashboard
-- ============================================================

-- 1. Remover triggers antigos e potencialmente duplicados da tabela public.profiles
DROP TRIGGER IF EXISTS tr_protect_sensitive_profile_fields ON public.profiles;
DROP TRIGGER IF EXISTS tr_protect_profile_system_fields ON public.profiles;
DROP TRIGGER IF EXISTS before_profile_update ON public.profiles;

-- 2. Recriar a função protect_sensitive_profile_fields de forma autônoma
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS trigger AS $$
BEGIN
  -- Se o usuário atual for autenticado (cliente/anunciante) ou anônimo, enforca proteção de campos restritos
  IF (current_setting('role', true) <> 'service_role') THEN
    -- Impedir alteração direta do plano (subscription_tier)
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

-- 3. Recriar protect_profile_system_fields como cópia autônoma (evita chamada direta a trigger function)
CREATE OR REPLACE FUNCTION public.protect_profile_system_fields()
RETURNS trigger AS $$
BEGIN
  IF (current_setting('role', true) <> 'service_role') THEN
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

-- 4. Criar o trigger limpo e único em public.profiles
CREATE TRIGGER before_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_profile_fields();

SELECT 'Triggers de profiles corrigidos com sucesso! Erro trigger functions can only be called as triggers resolvido.' AS status;
