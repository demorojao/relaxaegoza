-- =========================================================================
-- SCRIPT DE HARDENING DE SEGURANÇA E PROTEÇÃO CONTRA VULNERABILIDADES
-- =========================================================================

-- 1. CORREÇÃO DE PRIVILEGE ESCALATION E CONTROLE DE STATUS DE VERIFICAÇÃO EM PROFILES
CREATE OR REPLACE FUNCTION public.protect_profile_system_fields()
RETURNS trigger AS $$
BEGIN
  -- Se o usuário atual for autenticado (usuário comum) ou anônimo, enforca regras
  IF (current_setting('role', true) <> 'service_role') THEN
    -- Impedir alteração do papel (role)
    IF (OLD.role IS DISTINCT FROM NEW.role) THEN
      NEW.role := OLD.role;
    END IF;

    -- Impedir alteração do plano (subscription_tier)
    IF (OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier) THEN
      NEW.subscription_tier := OLD.subscription_tier;
    END IF;

    -- Impedir alteração direta de is_space_verified (selo de ambiente físico)
    IF (OLD.is_space_verified IS DISTINCT FROM NEW.is_space_verified) THEN
      NEW.is_space_verified := OLD.is_space_verified;
    END IF;

    -- Impedir auto-aprovação do status de verificação de identidade
    IF (OLD.verification_status IS DISTINCT FROM NEW.verification_status) THEN
      -- Usuários comuns só podem alterar o status para 'pending' (para solicitar verificação)
      -- Não podem definir como 'verified', 'rejected' ou voltar para 'none' se já estivessem pendentes/verificados
      IF (NEW.verification_status <> 'pending') THEN
        NEW.verification_status := OLD.verification_status;
      END IF;
    END IF;

    -- Se o usuário alterar os documentos/selfies enviados, força o status a resetar para 'pending'
    IF (OLD.verification_selfie IS DISTINCT FROM NEW.verification_selfie OR
        OLD.verification_document IS DISTINCT FROM NEW.verification_document) THEN
      NEW.verification_status := 'pending';
    END IF;

    -- Se o usuário mudar o nome ou idade e já estiver verificado, rebaixa o status para 'pending' para re-auditoria
    IF (OLD.verification_status = 'verified' AND (OLD.name IS DISTINCT FROM NEW.name OR OLD.age IS DISTINCT FROM NEW.age)) THEN
      NEW.verification_status := 'pending';
    END IF;

    -- Se o host alterar o arquivo de comprovação física do ambiente, revoga o selo e exige nova auditoria
    IF (OLD.space_verification_file IS DISTINCT FROM NEW.space_verification_file) THEN
      NEW.is_space_verified := false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Garante que a trigger esteja associada à função correta
DROP TRIGGER IF EXISTS tr_protect_sensitive_profile_fields ON public.profiles;
DROP TRIGGER IF EXISTS before_profile_update ON public.profiles;
CREATE TRIGGER before_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_system_fields();


-- 2. CORREÇÃO DE AUTO-APROVAÇÃO DE FOTOS DA GALERIA (INSERT + UPDATE)
CREATE OR REPLACE FUNCTION public.protect_photos_system_fields()
RETURNS trigger AS $$
BEGIN
  IF (current_setting('role', true) <> 'service_role') THEN
    IF TG_OP = 'INSERT' THEN
      -- Qualquer nova foto adicionada por usuário comum deve iniciar não-verificada
      NEW.is_verified := false;
    ELSIF TG_OP = 'UPDATE' THEN
      -- Em atualizações, impede alteração direta do status verificado
      IF (OLD.is_verified IS DISTINCT FROM NEW.is_verified) THEN
        NEW.is_verified := OLD.is_verified;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_protect_sensitive_photo_fields ON public.profile_photos;
DROP TRIGGER IF EXISTS before_photos_update ON public.profile_photos;
CREATE TRIGGER before_photos_update
  BEFORE INSERT OR UPDATE ON public.profile_photos
  FOR EACH ROW EXECUTE FUNCTION public.protect_photos_system_fields();


-- 3. CORREÇÃO DE AUTO-APROVAÇÃO DE REVIEWS (INSERT + UPDATE)
CREATE OR REPLACE FUNCTION public.protect_reviews_system_fields()
RETURNS trigger AS $$
BEGIN
  IF (current_setting('role', true) <> 'service_role') THEN
    IF TG_OP = 'INSERT' THEN
      -- Qualquer review inserido deve iniciar sem o selo de interação verificada
      NEW.is_verified_interaction := false;
    ELSIF TG_OP = 'UPDATE' THEN
      -- Impede alteração direta em caso de atualização
      IF (OLD.is_verified_interaction IS DISTINCT FROM NEW.is_verified_interaction) THEN
        NEW.is_verified_interaction := OLD.is_verified_interaction;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_protect_sensitive_review_fields ON public.reviews;
DROP TRIGGER IF EXISTS before_reviews_update ON public.reviews;
CREATE TRIGGER before_reviews_update
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.protect_reviews_system_fields();


-- 4. CRIAÇÃO DE PROTEÇÃO PARA VERIFICAÇÃO DE SALAS (INSERT + UPDATE)
CREATE OR REPLACE FUNCTION public.protect_rooms_system_fields()
RETURNS trigger AS $$
BEGIN
  IF (current_setting('role', true) <> 'service_role') THEN
    IF TG_OP = 'INSERT' THEN
      -- Novas salas iniciam como não verificadas
      NEW.is_verified := false;
    ELSIF TG_OP = 'UPDATE' THEN
      -- Impede auto-verificação no update
      IF (OLD.is_verified IS DISTINCT FROM NEW.is_verified) THEN
        NEW.is_verified := OLD.is_verified;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS before_rooms_insert_update ON public.rooms;
CREATE TRIGGER before_rooms_insert_update
  BEFORE INSERT OR UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.protect_rooms_system_fields();


-- 5. CRIAÇÃO DE TRIGGER DE SEGURANÇA E REGRAS DE NEGÓCIO PARA RESERVA DE SALAS (ROOM BOOKINGS)
CREATE OR REPLACE FUNCTION public.protect_room_bookings_fields()
RETURNS trigger AS $$
DECLARE
  user_role text;
  room_host_id uuid;
  room_price numeric;
  hours_diff numeric;
  start_h integer;
  start_m integer;
  end_h integer;
  end_m integer;
BEGIN
  -- Obter a role do usuário autenticado no Supabase
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  
  -- Buscar a quem pertence a sala e o seu respectivo valor por hora
  SELECT host_id, price_per_hour INTO room_host_id, room_price 
  FROM public.rooms 
  WHERE id = NEW.room_id;

  IF (current_setting('role', true) <> 'service_role') THEN
    -- Ações na criação da reserva (INSERT)
    IF TG_OP = 'INSERT' THEN
      -- Forçar status inicial sempre para 'pending'
      NEW.status := 'pending';
      
      -- Calcular o preço total de forma segura no lado do servidor
      -- Os horários vêm no formato "HH:MM"
      BEGIN
        start_h := split_part(NEW.start_time, ':', 1)::integer;
        start_m := split_part(NEW.start_time, ':', 2)::integer;
        end_h := split_part(NEW.end_time, ':', 1)::integer;
        end_m := split_part(NEW.end_time, ':', 2)::integer;
        
        hours_diff := (end_h - start_h) + (end_m - start_m)::numeric / 60.0;
        
        IF hours_diff <= 0 THEN
          RAISE EXCEPTION 'O horário de término deve ser posterior ao horário de início.';
        END IF;
        
        -- Sobrescrever total_price enviado pelo cliente para garantir conformidade
        NEW.total_price := hours_diff * room_price;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro ao calcular o preço total. Formato de hora aceito é HH:MM (ex: 14:00).';
      END;
      
    -- Ações na edição da reserva (UPDATE)
    ELSIF TG_OP = 'UPDATE' THEN
      -- Impedir fraude ou modificação de informações básicas de agendamento (datas, horários, preços, IDs)
      IF (NEW.room_id <> OLD.room_id OR 
          NEW.provider_id <> OLD.provider_id OR 
          NEW.booking_date <> OLD.booking_date OR 
          NEW.start_time <> OLD.start_time OR 
          NEW.end_time <> OLD.end_time OR 
          NEW.total_price <> OLD.total_price) THEN
        RAISE EXCEPTION 'Não é permitido alterar os detalhes de agendamento e valores de uma reserva ativa.';
      END IF;

      -- Controle rígido do fluxo de status
      IF (NEW.status IS DISTINCT FROM OLD.status) THEN
        -- Profissional que reservou (provider) só pode mudar para cancelado
        IF auth.uid() = OLD.provider_id THEN
          IF NEW.status <> 'cancelled' THEN
            RAISE EXCEPTION 'Como profissional, você só tem permissão para cancelar esta reserva ("cancelled").';
          END IF;
        -- Proprietário da sala (host) pode confirmar ou cancelar
        ELSIF auth.uid() = room_host_id THEN
          IF NEW.status NOT IN ('confirmed', 'cancelled') THEN
            RAISE EXCEPTION 'Como host, você só pode confirmar ou cancelar esta reserva.';
          END IF;
        -- Outros usuários que não sejam administradores são bloqueados
        ELSIF user_role <> 'admin' THEN
          RAISE EXCEPTION 'Você não tem permissão para gerenciar o status desta reserva.';
        END IF;

        -- Se a reserva está sendo confirmada, impedir sobreposição de horários
        IF NEW.status = 'confirmed' THEN
          IF EXISTS (
            SELECT 1 FROM public.room_bookings
            WHERE room_id = NEW.room_id
              AND id <> NEW.id
              AND booking_date = NEW.booking_date
              AND status = 'confirmed'
              AND (
                (NEW.start_time >= start_time AND NEW.start_time < end_time) OR
                (NEW.end_time > start_time AND NEW.end_time <= end_time) OR
                (NEW.start_time <= start_time AND NEW.end_time >= end_time)
              )
          ) THEN
            RAISE EXCEPTION 'Já existe uma reserva confirmada para esta sala neste mesmo dia e horário.';
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS before_room_booking_insert_update ON public.room_bookings;
CREATE TRIGGER before_room_booking_insert_update
  BEFORE INSERT OR UPDATE ON public.room_bookings
  FOR EACH ROW EXECUTE FUNCTION public.protect_room_bookings_fields();


-- 6. GARANTIA DE STORIES EFÊMEROS DE 24 HORAS NO BANCO
CREATE OR REPLACE FUNCTION public.enforce_story_expiration()
RETURNS trigger AS $$
BEGIN
  IF (current_setting('role', true) <> 'service_role') THEN
    NEW.expires_at := timezone('utc'::text, now()) + interval '24 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_enforce_story_expiration ON public.stories;
CREATE TRIGGER tr_enforce_story_expiration
  BEFORE INSERT ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.enforce_story_expiration();


-- 7. REMOÇÃO DE POLÍTICA PERMISSIVA DUPLICADA EM ANALYTICS
DROP POLICY IF EXISTS "Qualquer pessoa insere eventos de analytics" ON public.analytics_events;
