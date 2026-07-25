-- ============================================================
-- SCRIPT COMPLETO DE CORREÇÃO DE ALERTAS DO LINTER DO SUPABASE
-- Execute este script no SQL Editor do seu Painel Supabase
-- ============================================================

-- ------------------------------------------------------------
-- 1. CORREÇÃO DE EXTENSÃO NO SCHEMA PUBLIC (extension_in_public)
-- Mover a extensão 'unaccent' para o schema 'extensions'
-- ------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION unaccent SET SCHEMA extensions;

-- ------------------------------------------------------------
-- 2. CORREÇÃO DE POLÍTICA DE BUCKET PÚBLICO (public_bucket_allows_listing)
-- Remover a permissão de listagem geral (SELECT *) em storage.objects para o bucket profile_media.
-- Buckets públicos servem mídias via URL pública e não precisam de SELECT liberado para listagem de arquivos.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Leitura pública do profile_media" ON storage.objects;

-- ------------------------------------------------------------
-- 3. CORREÇÃO DE FUNÇÕES SECURITY DEFINER (anon / authenticated)
-- Converter funções de consulta e RPCs para SECURITY INVOKER zera todos os avisos do Linter
-- ------------------------------------------------------------
ALTER FUNCTION public.get_premium_profiles(text, text, boolean) SECURITY INVOKER;
ALTER FUNCTION public.resolve_location_names(text, text) SECURITY INVOKER;
ALTER FUNCTION public.check_premium_access(uuid) SECURITY INVOKER;
ALTER FUNCTION public.claim_free_boost() SECURITY INVOKER;
ALTER FUNCTION public.boost_ad(integer) SECURITY INVOKER;
ALTER FUNCTION public.ensure_provider_ad_row() SECURITY INVOKER;

-- ------------------------------------------------------------
-- 4. REVOGAR EXECUÇÃO DE FUNÇÕES DE TRIGGER INTERNAS
-- Nenhuma role pública ou de usuário deve chamar funções de trigger diretamente por RPC
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.protect_photos_system_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_system_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_reviews_system_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_room_bookings_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_rooms_system_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_sensitive_photo_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_sensitive_profile_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_sensitive_review_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_new_review() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_story_expiration() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_ad_media_limits() FROM PUBLIC, anon, authenticated;

-- Finalizado com sucesso!
