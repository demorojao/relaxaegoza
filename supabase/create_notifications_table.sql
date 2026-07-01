-- =========================================================================
-- SQL MIGRATION: CREATE NOTIFICATIONS SYSTEM FOR PROVIDERS
-- =========================================================================

-- 1. Create the notifications table
CREATE TABLE IF NOT EXISTS public.profile_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Create index on foreign key to prevent full table scans on delete
CREATE INDEX IF NOT EXISTS idx_profile_notifications_profile_id 
  ON public.profile_notifications(profile_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.profile_notifications ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for authenticated users (to read and mark as read their own notifications)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.profile_notifications;
CREATE POLICY "Users can view their own notifications" 
  ON public.profile_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.profile_notifications;
CREATE POLICY "Users can update their own notifications" 
  ON public.profile_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- 5. Trigger to automatically notify models on new reviews
CREATE OR REPLACE FUNCTION public.notify_on_new_review()
RETURNS trigger AS $$
DECLARE
  client_name text;
BEGIN
  -- Obtain the client's name from profiles
  SELECT COALESCE(name, 'Cliente Secreto') INTO client_name 
  FROM public.profiles 
  WHERE id = NEW.client_id;

  -- Insert notification for the provider
  INSERT INTO public.profile_notifications (profile_id, title, content, type)
  VALUES (
    NEW.provider_id,
    'Nova Avaliação Recebida! ⭐',
    client_name || ' deixou uma avaliação no seu perfil.',
    'new_review'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Attach trigger to reviews table
DROP TRIGGER IF EXISTS tr_notify_on_new_review ON public.reviews;
CREATE TRIGGER tr_notify_on_new_review
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_review();
