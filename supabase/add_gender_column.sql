-- SCRIPT PARA ADICIONAR A COLUNA GÊNERO NA TABELA PROFILES
-- Execute este script no SQL Editor do seu Dashboard do Supabase.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gender text DEFAULT 'Feminino' CHECK (gender IN ('Feminino', 'Masculino', 'Trans'));
