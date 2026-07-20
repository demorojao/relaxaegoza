-- =========================================================================
-- SCRIPT DE HARDENING DE SEGURANÇA E PROTEÇÃO DE COLUNAS (PRÉ-PRODUÇÃO)
-- =========================================================================

-- 1. PROTEÇÃO CONTRA ALTERAÇÃO NÃO AUTORIZADA DE COLUNAS SENSÍVEIS (COLUMN TAMPERING)
-- Impede que usuários normais (role 'authenticated') alterem diretamente no Supabase SDK
-- colunas privilegiadas como 'subscription_tier', 'verification_status', 'role', etc.

CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS trigger AS $$
BEGIN
  -- Se a alteração vier de um usuário autenticado comum (front-end client SDK)
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.subscription_tier = OLD.subscription_tier;
    NEW.verification_status = OLD.verification_status;
    NEW.role = OLD.role;
    NEW.boost_expires_at = OLD.boost_expires_at;
    NEW.is_space_verified = OLD.is_space_verified;
    NEW.verification_title = OLD.verification_title;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Remover o trigger se já existir e criar novamente
DROP TRIGGER IF EXISTS tr_protect_sensitive_profile_fields ON public.profiles;

CREATE TRIGGER tr_protect_sensitive_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_profile_fields();


-- 2. POLÍTICA DE SEGURANÇA DE STORAGE: ISOLAMENTO DO BUCKET PRIVADO DE VERIFICAÇÃO DE IDENTIDADE
-- Garante que o bucket 'verification-docs' seja inacessível para leitura pública via URL direta

-- Criar bucket se não existir e garantir public = false
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Permitir que usuários autenticados façam upload apenas na sua própria pasta
DROP POLICY IF EXISTS "Usuários sobem seus documentos de verificação" ON storage.objects;
CREATE POLICY "Usuários sobem seus documentos de verificação" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'verification-docs' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Impedir leitura pública direta (somente service_role tem acesso de leitura total)
DROP POLICY IF EXISTS "Público não lê documentos de verificação" ON storage.objects;
