-- Create products table
-- Stripe Commerce Module

-- ============================================================
-- 1. Create products table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Product fields
  name TEXT NOT NULL,
  description TEXT,
  product_type TEXT NOT NULL DEFAULT 'digital' CHECK (product_type IN ('token_pack', 'digital', 'feature', 'physical')),
  stripe_product_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- ============================================================
-- 2. Create indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at);
CREATE INDEX IF NOT EXISTS idx_products_product_type ON public.products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

-- ============================================================
-- 3. Enable Row Level Security (RLS)
-- ============================================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS Policies
-- ============================================================

-- Anyone can view active products (public catalog)
CREATE POLICY "Anyone can view active products"
  ON public.products
  FOR SELECT
  USING (is_active = true);

-- Service role can do everything (for admin operations)
CREATE POLICY "Service role has full access to products"
  ON public.products
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- 5. Trigger for updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at_trigger
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_products_updated_at();

-- ============================================================
-- 6. Comments (Documentation)
-- ============================================================

COMMENT ON TABLE public.products IS 'Products available for purchase via Stripe';
COMMENT ON COLUMN public.products.product_type IS 'Product type: token_pack, digital, feature, physical';
COMMENT ON COLUMN public.products.stripe_product_id IS 'Stripe Product ID (prod_xxx)';
COMMENT ON COLUMN public.products.metadata IS 'Product-type specific metadata (e.g., token_amount for token_pack)';
