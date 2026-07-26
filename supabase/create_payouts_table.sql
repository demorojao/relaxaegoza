-- Migration: Create payouts table and link to content_purchases
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  net_amount_cents INTEGER NOT NULL,
  pix_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  pushinpay_tx_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  processed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Policies for payouts
CREATE POLICY "Users can view their own payouts"
  ON public.payouts FOR SELECT
  USING (auth.uid() = provider_id);

CREATE POLICY "Service role can manage payouts"
  ON public.payouts FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add payout_id column to content_purchases if it doesn't exist yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'content_purchases' AND column_name = 'payout_id'
  ) THEN
    ALTER TABLE public.content_purchases 
    ADD COLUMN payout_id UUID REFERENCES public.payouts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_payouts_provider_id ON public.payouts(provider_id);
CREATE INDEX IF NOT EXISTS idx_content_purchases_payout_id ON public.content_purchases(payout_id);
