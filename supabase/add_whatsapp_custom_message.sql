-- SCRIPT PARA ADICIONAR A COLUNA WHATSAPP_CUSTOM_MESSAGE NA TABELA PROFILES
-- Execute este script no SQL Editor do seu Dashboard do Supabase.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS whatsapp_custom_message TEXT;
