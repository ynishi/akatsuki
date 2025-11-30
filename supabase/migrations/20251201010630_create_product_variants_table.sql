-- Create product_variants table
-- Stripe Commerce Module

-- ============================================================
-- 1. Create product_variants table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Variant fields
  name TEXT NOT NULL,
  price_amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'jpy',
  stripe_price_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0
);

-- ============================================================
-- 2. Create indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_stripe_price_id ON public.product_variants(stripe_price_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_is_active ON public.product_variants(is_active);

-- ============================================================
-- 3. Enable Row Level Security (RLS)
-- ============================================================

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS Policies
-- ============================================================

-- Anyone can view active variants (public catalog)
CREATE POLICY "Anyone can view active variants"
  ON public.product_variants
  FOR SELECT
  USING (is_active = true);

-- Service role can do everything (for admin operations)
CREATE POLICY "Service role has full access to product_variants"
  ON public.product_variants
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- 5. Trigger for updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_product_variants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_variants_updated_at_trigger
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_variants_updated_at();

-- ============================================================
-- 6. Comments (Documentation)
-- ============================================================

COMMENT ON TABLE public.product_variants IS 'Product price variants with Stripe Price integration';
COMMENT ON COLUMN public.product_variants.price_amount IS 'Price in smallest currency unit (e.g., yen for JPY)';
COMMENT ON COLUMN public.product_variants.stripe_price_id IS 'Stripe Price ID (price_xxx)';
COMMENT ON COLUMN public.product_variants.metadata IS 'Variant-specific metadata (can override product metadata)';
