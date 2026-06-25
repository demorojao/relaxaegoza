-- =========================================================================
-- SCRIPT DE HARDENING DE RLS E OTIMIZAÇÃO DE PERFORMANCE PRÉ-LANÇAMENTO
-- =========================================================================

-- 1. HARDENING DE RLS: Split de políticas FOR ALL com WITH CHECK

-- Tabela: public.profile_photos
DROP POLICY IF EXISTS "Provedores gerenciam suas fotos" ON public.profile_photos;

CREATE POLICY "Provedores inserem suas fotos" ON public.profile_photos 
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Provedores atualizam suas fotos" ON public.profile_photos 
  FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Provedores deletam suas fotos" ON public.profile_photos 
  FOR DELETE USING (auth.uid() = profile_id);


-- Tabela: public.profile_specialties
DROP POLICY IF EXISTS "Provedores gerenciam suas especialidades" ON public.profile_specialties;

CREATE POLICY "Provedores inserem suas especialidades" ON public.profile_specialties 
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Provedores atualizam suas especialidades" ON public.profile_specialties 
  FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Provedores deletam suas especialidades" ON public.profile_specialties 
  FOR DELETE USING (auth.uid() = profile_id);


-- Tabela: public.stories
DROP POLICY IF EXISTS "Provedores gerenciam seus próprios stories" ON public.stories;

CREATE POLICY "Provedores inserem seus próprios stories" ON public.stories 
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Provedores atualizam seus próprios stories" ON public.stories 
  FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Provedores deletam seus próprios stories" ON public.stories 
  FOR DELETE USING (auth.uid() = profile_id);


-- Tabela: public.reviews
DROP POLICY IF EXISTS "Clientes gerenciam suas próprias reviews" ON public.reviews;

CREATE POLICY "Clientes atualizam suas próprias reviews" ON public.reviews 
  FOR UPDATE USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clientes deletam suas próprias reviews" ON public.reviews 
  FOR DELETE USING (auth.uid() = client_id);


-- 2. HARDENING DE RLS: Segurança para Salas e Reservas (rooms & room_bookings)

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_bookings ENABLE ROW LEVEL SECURITY;

-- Políticas para public.rooms
DROP POLICY IF EXISTS "Salas visíveis publicamente" ON public.rooms;
CREATE POLICY "Salas visíveis publicamente" ON public.rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Hosts inserem suas próprias salas" ON public.rooms;
CREATE POLICY "Hosts inserem suas próprias salas" ON public.rooms 
  FOR INSERT WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Hosts atualizam suas próprias salas" ON public.rooms;
CREATE POLICY "Hosts atualizam suas próprias salas" ON public.rooms 
  FOR UPDATE USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Hosts deletam suas próprias salas" ON public.rooms;
CREATE POLICY "Hosts deletam suas próprias salas" ON public.rooms 
  FOR DELETE USING (auth.uid() = host_id);

-- Políticas para public.room_bookings
DROP POLICY IF EXISTS "Usuários leem suas próprias reservas" ON public.room_bookings;
CREATE POLICY "Usuários leem suas próprias reservas" ON public.room_bookings 
  FOR SELECT USING (auth.uid() = provider_id OR auth.uid() = (SELECT host_id FROM public.rooms WHERE id = room_id));

DROP POLICY IF EXISTS "Provedores podem solicitar reservas" ON public.room_bookings;
CREATE POLICY "Provedores podem solicitar reservas" ON public.room_bookings 
  FOR INSERT WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS "Usuários atualizam suas próprias reservas" ON public.room_bookings;
CREATE POLICY "Usuários atualizam suas próprias reservas" ON public.room_bookings 
  FOR UPDATE USING (auth.uid() = provider_id OR auth.uid() = (SELECT host_id FROM public.rooms WHERE id = room_id))
  WITH CHECK (auth.uid() = provider_id OR auth.uid() = (SELECT host_id FROM public.rooms WHERE id = room_id));

DROP POLICY IF EXISTS "Usuários deletam suas próprias reservas" ON public.room_bookings;
CREATE POLICY "Usuários deletam suas próprias reservas" ON public.room_bookings 
  FOR DELETE USING (auth.uid() = provider_id OR auth.uid() = (SELECT host_id FROM public.rooms WHERE id = room_id));


-- 3. OTIMIZAÇÃO DE PERFORMANCE: Índices em Foreign Keys para evitar Full Table Scans

CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON public.rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_room_id ON public.room_bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_provider_id ON public.room_bookings(provider_id);
