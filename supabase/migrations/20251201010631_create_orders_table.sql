-- Create orders table
-- Stripe Commerce Module

-- ============================================================
-- 1. Create orders table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Stripe fields
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,

  -- Order fields
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'fulfilled', 'cancelled', 'refunded')),
  total_amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'jpy',
  metadata JSONB DEFAULT '{}'::jsonb,
  fulfilled_at TIMESTAMPTZ
);

-- ============================================================
-- 2. Create indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_checkout_session_id ON public.orders(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- ============================================================
-- 3. Enable Row Level Security (RLS)
-- ============================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS Policies
-- ============================================================

-- Users can view own orders
CREATE POLICY "Users can view own orders"
  ON public.orders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create own orders (via checkout)
CREATE POLICY "Users can create own orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for webhook processing)
CREATE POLICY "Service role has full access to orders"
  ON public.orders
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- 5. Trigger for updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_orders_updated_at();

-- ============================================================
-- 6. Comments (Documentation)
-- ============================================================

COMMENT ON TABLE public.orders IS 'Purchase orders with Stripe Checkout integration';
COMMENT ON COLUMN public.orders.stripe_checkout_session_id IS 'Stripe Checkout Session ID (cs_xxx)';
COMMENT ON COLUMN public.orders.stripe_payment_intent_id IS 'Stripe Payment Intent ID (pi_xxx)';
COMMENT ON COLUMN public.orders.status IS 'Order status: pending, paid, fulfilled, cancelled, refunded';
COMMENT ON COLUMN public.orders.total_amount IS 'Total amount in smallest currency unit';
