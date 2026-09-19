-- =========================================================================
-- ATUALIZAÇÃO DA POLÍTICA RLS PARA EXPIRAÇÃO AUTOMÁTICA DE ANÚNCIOS (7 DIAS)
-- Anúncios sem renovação após 7 dias ficam automaticamente invisíveis na busca pública
-- =========================================================================

-- Recriar política RLS na tabela 'ads' garantindo a janela de 7 dias
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_select" ON public.ads;
DROP POLICY IF EXISTS "Anúncios ativos visíveis publicamente" ON public.ads;

CREATE POLICY "ads_select_active_7days" ON public.ads 
  FOR SELECT 
  USING (
    is_active = true 
    AND (COALESCE(updated_at, created_at) >= (now() - interval '7 days'))
  );

-- Garantir políticas de manutenção do proprietário do anúncio
DROP POLICY IF EXISTS "ads_insert" ON public.ads;
CREATE POLICY "ads_insert" ON public.ads FOR INSERT WITH CHECK ((SELECT auth.uid()) = profile_id);

DROP POLICY IF EXISTS "ads_update" ON public.ads;
CREATE POLICY "ads_update" ON public.ads FOR UPDATE USING ((SELECT auth.uid()) = profile_id) WITH CHECK ((SELECT auth.uid()) = profile_id);

DROP POLICY IF EXISTS "ads_delete" ON public.ads;
CREATE POLICY "ads_delete" ON public.ads FOR DELETE USING ((SELECT auth.uid()) = profile_id);

SELECT 'Política RLS de expiração automática de 7 dias aplicada com sucesso no Supabase!' AS status;
