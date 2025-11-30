-- Create order_items table
-- Stripe Commerce Module

-- ============================================================
-- 1. Create order_items table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Product reference (snapshot - may be null if product deleted)
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,

  -- Snapshot of product info at purchase time
  product_name TEXT NOT NULL,
  variant_name TEXT,

  -- Quantity & pricing
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,

  -- Product type for fulfillment
  product_type TEXT NOT NULL,
  product_metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================
-- 2. Create indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- ============================================================
-- 3. Enable Row Level Security (RLS)
-- ============================================================

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS Policies
-- ============================================================

-- Users can view own order items
CREATE POLICY "Users can view own order items"
  ON public.order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Service role can do everything (for webhook processing)
CREATE POLICY "Service role has full access to order_items"
  ON public.order_items
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- 5. Comments (Documentation)
-- ============================================================

COMMENT ON TABLE public.order_items IS 'Individual items within an order (snapshot of product at purchase time)';
COMMENT ON COLUMN public.order_items.product_name IS 'Product name at time of purchase (snapshot)';
COMMENT ON COLUMN public.order_items.product_metadata IS 'Product metadata at time of purchase (for fulfillment)';
