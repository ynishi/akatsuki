-- Create fulfillments table
-- Stripe Commerce Module

-- ============================================================
-- 1. Create fulfillments table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fulfillments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Fulfillment fields
  fulfillment_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),

  -- Processing result
  result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- 2. Create indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_fulfillments_order_item_id ON public.fulfillments(order_item_id);
CREATE INDEX IF NOT EXISTS idx_fulfillments_status ON public.fulfillments(status);
CREATE INDEX IF NOT EXISTS idx_fulfillments_fulfillment_type ON public.fulfillments(fulfillment_type);

-- ============================================================
-- 3. Enable Row Level Security (RLS)
-- ============================================================

ALTER TABLE public.fulfillments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS Policies
-- ============================================================

-- Users can view own fulfillments
CREATE POLICY "Users can view own fulfillments"
  ON public.fulfillments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items
      JOIN public.orders ON orders.id = order_items.order_id
      WHERE order_items.id = fulfillments.order_item_id
      AND orders.user_id = auth.uid()
    )
  );

-- Service role can do everything (for webhook processing)
CREATE POLICY "Service role has full access to fulfillments"
  ON public.fulfillments
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- 5. Comments (Documentation)
-- ============================================================

COMMENT ON TABLE public.fulfillments IS 'Fulfillment records for purchased items (token delivery, feature unlock, etc.)';
COMMENT ON COLUMN public.fulfillments.fulfillment_type IS 'Type of fulfillment: token_pack, digital, feature, etc.';
COMMENT ON COLUMN public.fulfillments.result IS 'Fulfillment result (e.g., {"tokens_added": 100, "new_balance": 500})';
