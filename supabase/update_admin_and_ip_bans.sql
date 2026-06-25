-- 1. Adicionar colunas na tabela profiles se não existirem
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_title text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_ip text;

-- 2. Atualizar a função protect_sensitive_profile_fields para proteger verification_title
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS trigger AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.subscription_tier = OLD.subscription_tier;
    NEW.verification_status = OLD.verification_status;
    NEW.is_space_verified = OLD.is_space_verified;
    NEW.verification_title = OLD.verification_title; -- Protege o título de verificação contra column tampering
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar a tabela ip_bans
CREATE TABLE IF NOT EXISTS public.ip_bans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address text UNIQUE NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS na tabela ip_bans
ALTER TABLE public.ip_bans ENABLE ROW LEVEL SECURITY;

-- Criar índice para performance de buscas por IP
CREATE INDEX IF NOT EXISTS idx_ip_bans_ip_address ON public.ip_bans(ip_address);
