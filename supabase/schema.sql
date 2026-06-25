-- Habilitar a extensão uuid-ossp caso necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Especialidades
CREATE TABLE IF NOT EXISTS public.specialties (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text UNIQUE NOT NULL
);

ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;

-- Evita erro se a política já existir ao rodar o script novamente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'specialties' AND policyname = 'Especialidades visíveis publicamente'
  ) THEN
    CREATE POLICY "Especialidades visíveis publicamente" ON public.specialties FOR SELECT USING (true);
  END IF;
END
$$;

-- Popular algumas especialidades padrão
INSERT INTO public.specialties (name) VALUES 
('Massagem Tântrica'),
('Nuru'),
('Relaxante'),
('Acompanhante'),
('Namorada Fake'),
('Massagem Nuru'),
('Massagem Relaxante'),
('Tailandesa'),
('Shiatsu'),
('G-Spot'),
('Acompanhante Trans'),
('Acompanhante Masculino'),
('Namorada de Aluguel'),
('Massagem Tantra'),
('Massagem Erótica'),
('Massagem G-Spot'),
('Massagem Ananda'),
('Massagem Sueca'),
('Reflexologia'),
('Drenagem Linfática'),
('Massagem Desportiva'),
('Massagem Quatro Mãos'),
('Acompanhante Luxo'),
('BDSM / Dominação'),
('Fetiches'),
('Cosplay / Roleplay'),
('Jantar & Eventos'),
('Viagens')
ON CONFLICT DO NOTHING;

-- 2. Tabela de Perfis (Vinculada à tabela auth.users do Supabase)
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('provider', 'client')),
  bio text,
  age integer NOT NULL CHECK (age >= 18),
  city text NOT NULL,
  price_per_hour numeric NOT NULL DEFAULT 0,
  avatar_url text,
  whatsapp text,
  whatsapp_custom_message text,
  neighborhood text,
  
  -- Identidade & Verificação
  verification_status text DEFAULT 'none' CHECK (verification_status IN ('none', 'pending', 'verified', 'rejected')),
  verification_selfie text,
  verification_document text,
  is_space_verified boolean DEFAULT false, -- Selo de Ambiente Auditado
  
  -- Assinatura e Boosting
  subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'gold')),
  is_available_now boolean DEFAULT false,
  available_until timestamp with time zone,
  
  -- Campos Adicionais
  amenities text[],
  category text DEFAULT 'massage' CHECK (category IN ('massage', 'escort', 'both')),
  gender text DEFAULT 'Feminino' CHECK (gender IN ('Feminino', 'Masculino', 'Trans')),
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT check_available_tier CHECK (NOT is_available_now OR subscription_tier IN ('pro', 'gold'))
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfis de provedores visíveis publicamente" 
  ON public.profiles FOR SELECT USING (role = 'provider');

CREATE POLICY "Usuários leem o próprio perfil" 
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuários inserem o próprio perfil" 
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuários atualizam o próprio perfil" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 3. Tabela de Relacionamento (Perfis <-> Especialidades)
CREATE TABLE public.profile_specialties (
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  specialty_id uuid REFERENCES public.specialties(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, specialty_id)
);

ALTER TABLE public.profile_specialties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Especialidades de perfis visíveis publicamente" 
  ON public.profile_specialties FOR SELECT USING (true);

CREATE POLICY "Provedores inserem suas especialidades" ON public.profile_specialties 
  FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Provedores atualizam suas especialidades" ON public.profile_specialties 
  FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Provedores deletam suas especialidades" ON public.profile_specialties 
  FOR DELETE USING (auth.uid() = profile_id);

-- 4. Tabela de Fotos da Galeria
CREATE TABLE public.profile_photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  is_verified boolean DEFAULT false,
  media_type text DEFAULT 'photo' CHECK (media_type IN ('photo', 'video')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profile_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fotos de perfis visíveis publicamente se provedor" 
  ON public.profile_photos FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_photos.profile_id AND role = 'provider') OR auth.uid() = profile_id);

CREATE POLICY "Provedores inserem suas fotos" ON public.profile_photos 
  FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Provedores atualizam suas fotos" ON public.profile_photos 
  FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Provedores deletam suas fotos" ON public.profile_photos 
  FOR DELETE USING (auth.uid() = profile_id);

-- 5. Tabela de Avaliações Multicritério (Reviews)
CREATE TABLE public.reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating_massage integer NOT NULL CHECK (rating_massage BETWEEN 1 AND 5),
  rating_service integer NOT NULL CHECK (rating_service BETWEEN 1 AND 5),
  rating_environment integer NOT NULL CHECK (rating_environment BETWEEN 1 AND 5),
  comment text,
  is_verified_interaction boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews visíveis publicamente" 
  ON public.reviews FOR SELECT USING (true);

CREATE POLICY "Clientes autenticados podem inserir reviews" 
  ON public.reviews FOR INSERT 
  WITH CHECK (
    auth.uid() = client_id AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'client')
  );

CREATE POLICY "Clientes atualizam suas próprias reviews" ON public.reviews 
  FOR UPDATE USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Clientes deletam suas próprias reviews" ON public.reviews 
  FOR DELETE USING (auth.uid() = client_id);

-- 6. Trigger e Função para Criação Automática de Perfil no Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    name, 
    role, 
    age, 
    city, 
    price_per_hour, 
    whatsapp, 
    neighborhood,
    subscription_tier,
    latitude,
    longitude
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'Usuário'),
    COALESCE(new.raw_user_meta_data->>'role', 'client'),
    COALESCE((new.raw_user_meta_data->>'age')::integer, 18),
    COALESCE(new.raw_user_meta_data->>'city', 'São Paulo'),
    COALESCE((new.raw_user_meta_data->>'price_per_hour')::numeric, 0),
    COALESCE(new.raw_user_meta_data->>'whatsapp', ''),
    COALESCE(new.raw_user_meta_data->>'neighborhood', ''),
    'free',
    COALESCE((new.raw_user_meta_data->>'latitude')::numeric, -23.56 + (random() - 0.5) * 0.08),
    COALESCE((new.raw_user_meta_data->>'longitude')::numeric, -46.65 + (random() - 0.5) * 0.08)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Tabela de Stories Efêmeros
CREATE TABLE IF NOT EXISTS public.stories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('photo', 'video')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at timestamp with time zone DEFAULT (timezone('utc'::text, now()) + interval '24 hours') NOT NULL
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stories visíveis publicamente" 
  ON public.stories FOR SELECT 
  USING (expires_at > now());

CREATE POLICY "Provedores inserem seus próprios stories" ON public.stories 
  FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Provedores atualizam seus próprios stories" ON public.stories 
  FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Provedores deletam seus próprios stories" ON public.stories 
  FOR DELETE USING (auth.uid() = profile_id);

-- Função Trigger para enforçar os limites do plano
CREATE OR REPLACE FUNCTION public.check_stories_limit()
RETURNS trigger AS $$
DECLARE
  user_tier text;
  stories_count integer;
BEGIN
  -- Buscar o subscription_tier da profissional
  SELECT subscription_tier INTO user_tier 
  FROM public.profiles 
  WHERE id = NEW.profile_id;

  -- Bronze (free) não pode postar
  IF user_tier = 'free' OR user_tier IS NULL THEN
    RAISE EXCEPTION 'O plano Bronze (Grátis) não permite postar Stories. Faça upgrade para Pro ou Gold.';
  END IF;

  -- Pro (Silver) permite 3 stories a cada 24 horas
  IF user_tier = 'pro' THEN
    SELECT COUNT(*) INTO stories_count 
    FROM public.stories 
    WHERE profile_id = NEW.profile_id 
      AND created_at > (timezone('utc'::text, now()) - interval '24 hours');
    
    IF stories_count >= 3 THEN
      RAISE EXCEPTION 'Limite atingido! Profissionais no plano Pro podem postar no máximo 3 stories a cada 24 horas.';
    END IF;
  END IF;

  -- Gold tem postagens ilimitadas
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger
DROP TRIGGER IF EXISTS before_story_insert ON public.stories;
CREATE TRIGGER before_story_insert
  BEFORE INSERT ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.check_stories_limit();

-- ==========================================
-- CORREÇÕES DE SEGURANÇA E PERFORMANCE
-- ==========================================

-- 1. Triggers de Proteção contra Column Tampering (Falsificação de Dados)
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS trigger AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.subscription_tier = OLD.subscription_tier;
    NEW.verification_status = OLD.verification_status;
    NEW.is_space_verified = OLD.is_space_verified;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_protect_sensitive_profile_fields ON public.profiles;
CREATE TRIGGER tr_protect_sensitive_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_profile_fields();

CREATE OR REPLACE FUNCTION public.protect_sensitive_photo_fields()
RETURNS trigger AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.is_verified = OLD.is_verified;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_protect_sensitive_photo_fields ON public.profile_photos;
CREATE TRIGGER tr_protect_sensitive_photo_fields
  BEFORE UPDATE ON public.profile_photos
  FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_photo_fields();

CREATE OR REPLACE FUNCTION public.protect_sensitive_review_fields()
RETURNS trigger AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.is_verified_interaction = OLD.is_verified_interaction;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_protect_sensitive_review_fields ON public.reviews;
CREATE TRIGGER tr_protect_sensitive_review_fields
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_review_fields();

-- 2. Índices de Performance para Foreign Keys
CREATE INDEX IF NOT EXISTS idx_profile_photos_profile_id ON public.profile_photos(profile_id);
CREATE INDEX IF NOT EXISTS idx_reviews_provider_id ON public.reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON public.reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_stories_profile_id ON public.stories(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_specialties_profile_id ON public.profile_specialties(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_specialties_specialty_id ON public.profile_specialties(specialty_id);
CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON public.rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_room_id ON public.room_bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_provider_id ON public.room_bookings(provider_id);

