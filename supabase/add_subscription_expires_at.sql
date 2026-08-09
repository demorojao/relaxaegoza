-- Adicionar coluna subscription_expires_at na tabela public.profiles caso ainda não exista
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'subscription_expires_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_expires_at timestamp with time zone;
  END IF;
END $$;
