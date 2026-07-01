-- Tabela de Denúncias
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reported_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para reports
-- Qualquer um pode inserir (visitante ou logado)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'reports' AND policyname = 'Permitir inserção pública de denúncias'
  ) THEN
    CREATE POLICY "Permitir inserção pública de denúncias" ON public.reports 
      FOR INSERT WITH CHECK (true);
  END IF;
END
$$;

-- Apenas admins podem gerenciar denúncias
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'reports' AND policyname = 'Admins podem gerenciar denúncias'
  ) THEN
    CREATE POLICY "Admins podem gerenciar denúncias" ON public.reports 
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      );
  END IF;
END
$$;

-- Coluna tags na tabela reviews
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Coluna business_hours na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_hours jsonb DEFAULT '{}'::jsonb;
