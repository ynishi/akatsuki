-- Stripe Commerce Module - Seed Data
-- Run after table creation

-- ============================================================
-- 1. Register Stripe Webhook
-- ============================================================

-- Note: Replace <STRIPE_WEBHOOK_SECRET> with actual secret from Stripe Dashboard
-- Or set via Supabase Secrets: supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx

INSERT INTO public.webhooks (
  name,
  provider,
  handler_name,
  event_type_prefix,
  signature_header,
  secret_key,
  is_active,
  description
) VALUES (
  'stripe-checkout',
  'stripe',
  'stripe-checkout-completed',
  'stripe',
  'stripe-signature',
  '', -- Set via environment or update manually
  true,
  'Stripe Checkout Session Completed webhook for processing payments'
) ON CONFLICT (name) DO UPDATE SET
  handler_name = EXCLUDED.handler_name,
  is_active = EXCLUDED.is_active;

-- ============================================================
-- 2. Sample Products (Token Packs)
-- ============================================================

-- LLM Token Pack - 100 Tokens
INSERT INTO public.products (
  id,
  name,
  description,
  product_type,
  metadata,
  is_active,
  display_order
) VALUES (
  'a1b2c3d4-1111-1111-1111-111111111111',
  'LLM Token Pack',
  'LLM APIで使えるトークンパック。AIチャットや画像生成に使用できます。',
  'token_pack',
  '{}',
  true,
  1
) ON CONFLICT (id) DO NOTHING;

-- Variants for Token Pack
INSERT INTO public.product_variants (
  id,
  product_id,
  name,
  price_amount,
  currency,
  metadata,
  is_default,
  is_active,
  display_order
) VALUES
  -- 100 Tokens - ¥500
  (
    'b2c3d4e5-1111-1111-1111-111111111111',
    'a1b2c3d4-1111-1111-1111-111111111111',
    '100 Tokens',
    500,
    'jpy',
    '{"token_amount": 100}',
    true,
    true,
    1
  ),
  -- 500 Tokens - ¥2,000 (20% OFF)
  (
    'b2c3d4e5-2222-2222-2222-222222222222',
    'a1b2c3d4-1111-1111-1111-111111111111',
    '500 Tokens (20% OFF)',
    2000,
    'jpy',
    '{"token_amount": 500}',
    false,
    true,
    2
  ),
  -- 1000 Tokens - ¥3,500 (30% OFF)
  (
    'b2c3d4e5-3333-3333-3333-333333333333',
    'a1b2c3d4-1111-1111-1111-111111111111',
    '1000 Tokens (30% OFF)',
    3500,
    'jpy',
    '{"token_amount": 1000}',
    false,
    true,
    3
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Comments
-- ============================================================

COMMENT ON TABLE public.products IS 'Products table with sample LLM Token Pack';
