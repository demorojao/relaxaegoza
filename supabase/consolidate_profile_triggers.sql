-- Consolidar triggers de profiles em uma única função e remover triggers conflitantes

-- 1. Remover trigger antigo de linter/hardening se existir
DROP TRIGGER IF EXISTS tr_protect_sensitive_profile_fields ON public.profiles;

-- 2. Recriar a função de proteção de campos de profiles
CREATE OR REPLACE FUNCTION public.protect_profile_system_fields()
RETURNS trigger AS $$
BEGIN
  -- Se o usuário atual for autenticado (usuário comum) ou anônimo, enforca regras de proteção de campos do sistema
  IF (current_setting('role', true) <> 'service_role') THEN
    -- Impedir alteração do papel (role)
    IF (OLD.role IS DISTINCT FROM NEW.role) THEN
      NEW.role := OLD.role;
    END IF;

    -- Impedir alteração do plano (subscription_tier)
    IF (OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier) THEN
      NEW.subscription_tier := OLD.subscription_tier;
    END IF;

    -- Impedir alteração direta de is_space_verified (selo de ambiente físico)
    IF (OLD.is_space_verified IS DISTINCT FROM NEW.is_space_verified) THEN
      NEW.is_space_verified := OLD.is_space_verified;
    END IF;

    -- Impedir alteração direta do status do boost
    IF (OLD.boost_expires_at IS DISTINCT FROM NEW.boost_expires_at) THEN
      NEW.boost_expires_at := OLD.boost_expires_at;
    END IF;

    -- Impedir auto-aprovação do status de verificação de identidade
    IF (OLD.verification_status IS DISTINCT FROM NEW.verification_status) THEN
      -- Usuários comuns só podem alterar o status para 'pending' (para solicitar verificação)
      -- Não podem definir como 'verified', 'rejected' ou voltar para 'none' se já estivessem pendentes/verificados
      IF (NEW.verification_status <> 'pending') THEN
        NEW.verification_status := OLD.verification_status;
      END IF;
    END IF;

    -- Se o usuário alterar os documentos/selfies enviados, força o status a resetar para 'pending'
    IF (OLD.verification_selfie IS DISTINCT FROM NEW.verification_selfie OR
        OLD.verification_document IS DISTINCT FROM NEW.verification_document) THEN
      NEW.verification_status := 'pending';
    END IF;

    -- Se o host alterar o arquivo de comprovação física do ambiente, revoga o selo e exige nova auditoria
    IF (OLD.space_verification_file IS DISTINCT FROM NEW.space_verification_file) THEN
      NEW.is_space_verified := false;
    END IF;

    -- Se o usuário mudar o nome, idade ou avatar_url e já estiver verificado, rebaixa o status para 'pending' para re-auditoria administrativa
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

-- 3. Garantir que apenas o trigger before_profile_update está ativo e chama a função correta
DROP TRIGGER IF EXISTS before_profile_update ON public.profiles;
CREATE TRIGGER before_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_system_fields();
