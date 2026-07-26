-- Adiciona coluna business_hours na tabela profiles se não existir
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{}'::jsonb;
