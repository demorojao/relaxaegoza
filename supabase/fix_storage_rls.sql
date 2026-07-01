-- ============================================================
-- CORREÇÃO DE RLS DO STORAGE: BUCKET profile_media
-- ============================================================
-- O Supabase Storage usa RLS na tabela storage.objects.
-- Sem políticas, o bucket bloqueia todos os uploads (mesmo de usuários autenticados).

-- 1. Garantir que o bucket profile_media existe e é público (para leitura)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile_media',
  'profile_media',
  true,
  26214400,  -- 25MB (para comportar vídeos comprimidos client-side)
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'];


-- 2. Políticas de RLS para storage.objects (bucket profile_media)

-- Leitura pública de arquivos do bucket profile_media
DROP POLICY IF EXISTS "Leitura pública do profile_media" ON storage.objects;
CREATE POLICY "Leitura pública do profile_media"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'profile_media');

-- Upload: usuário autenticado só pode fazer upload na própria pasta (user.id/...)
DROP POLICY IF EXISTS "Upload autenticado no profile_media" ON storage.objects;
CREATE POLICY "Upload autenticado no profile_media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile_media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- Update/Upsert: usuário autenticado só pode atualizar seus próprios arquivos
DROP POLICY IF EXISTS "Update autenticado no profile_media" ON storage.objects;
CREATE POLICY "Update autenticado no profile_media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile_media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  )
  WITH CHECK (
    bucket_id = 'profile_media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- Delete: usuário autenticado só pode deletar seus próprios arquivos
DROP POLICY IF EXISTS "Delete autenticado no profile_media" ON storage.objects;
CREATE POLICY "Delete autenticado no profile_media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile_media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );


-- ============================================================
-- VERIFICAÇÃO E CORREÇÃO DAS POLÍTICAS DA TABELA profile_photos
-- ============================================================
-- Garantir que políticas de INSERT estejam corretas e não conflitem

-- Remove duplicatas que possam ter sido criadas por múltiplos scripts
DROP POLICY IF EXISTS "Provedores inserem suas fotos" ON public.profile_photos;
DROP POLICY IF EXISTS "Provedores atualizam suas fotos" ON public.profile_photos;
DROP POLICY IF EXISTS "Provedores deletam suas fotos" ON public.profile_photos;
DROP POLICY IF EXISTS "Fotos de perfis visíveis publicamente se provedor" ON public.profile_photos;

-- Recriar políticas limpas
CREATE POLICY "Fotos de perfis visíveis publicamente se provedor"
  ON public.profile_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = profile_photos.profile_id AND role = 'provider'
    )
    OR (SELECT auth.uid()) = profile_id
  );

CREATE POLICY "Provedores inserem suas fotos"
  ON public.profile_photos FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = profile_id);

CREATE POLICY "Provedores atualizam suas fotos"
  ON public.profile_photos FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = profile_id)
  WITH CHECK ((SELECT auth.uid()) = profile_id);

CREATE POLICY "Provedores deletam suas fotos"
  ON public.profile_photos FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = profile_id);
