-- Script de Segurança e Hardening para Conta Administrativa e Auditoria
-- Executar no Editor SQL do Supabase Dashboard

-- 1. Tabela de Logs de Auditoria do Painel Admin
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar RLS na tabela de auditoria
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Política RLS: Apenas admins podem ler logs de auditoria
CREATE POLICY "Apenas admins podem visualizar logs de auditoria"
  ON public.admin_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 2. Trigger para Impedir Elevação de Privilégios Não Autorizada (Auto-promoção a Admin)
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_admin_promotion()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o campo 'role' estiver sendo alterado para 'admin'
  IF NEW.role = 'admin' AND (OLD.role IS NULL OR OLD.role <> 'admin') THEN
    -- Verificar se o executor atual (auth.uid()) é um admin válido no banco
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) AND current_setting('role', true) <> 'service_role' THEN
      RAISE EXCEPTION 'Acesso Negado: Apenas administradores autorizados ou o servidor podem alterar atribuições de privilégios admin.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Aplicar o trigger na tabela profiles
DROP TRIGGER IF EXISTS tr_prevent_unauthorized_admin_promotion ON public.profiles;

CREATE TRIGGER tr_prevent_unauthorized_admin_promotion
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_unauthorized_admin_promotion();
