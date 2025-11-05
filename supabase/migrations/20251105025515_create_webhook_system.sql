-- Webhook System: External webhook receiver and handler
-- Pattern: External Service -> webhook-receiver -> Event System

-- ============================================================
-- Table: webhooks
-- ============================================================
-- Webhook endpoint configuration
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  name TEXT NOT NULL UNIQUE,                    -- 'github-push', 'stripe-payment'
  provider TEXT NOT NULL,                       -- 'github', 'stripe', 'slack', 'custom'
  description TEXT,

  -- Authentication
  secret_key TEXT NOT NULL,                     -- Signature verification secret
  signature_header TEXT NOT NULL DEFAULT 'X-Webhook-Signature',
  signature_algorithm TEXT NOT NULL DEFAULT 'sha256',  -- 'sha256', 'sha1', 'hmac-sha256'

  -- Handler configuration
  handler_name TEXT NOT NULL,                   -- Handler name in handlers.ts ('github-push')
  event_type_prefix TEXT NOT NULL,              -- Event type prefix ('webhook:github')

  -- Filtering (optional)
  filter_conditions JSONB DEFAULT '{}',         -- Request body filter conditions

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_received_at TIMESTAMPTZ,                 -- Last received timestamp
  received_count INTEGER NOT NULL DEFAULT 0,    -- Received count
  failed_count INTEGER NOT NULL DEFAULT 0,      -- Failed count

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_webhooks_name ON webhooks(name);
CREATE INDEX idx_webhooks_provider ON webhooks(provider);
CREATE INDEX idx_webhooks_is_active ON webhooks(is_active);

-- Updated_at trigger
CREATE TRIGGER set_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE webhooks IS 'Webhook endpoint configuration';
COMMENT ON COLUMN webhooks.name IS 'Unique webhook identifier (e.g., github-push)';
COMMENT ON COLUMN webhooks.provider IS 'Provider name (github, stripe, slack, custom)';
COMMENT ON COLUMN webhooks.secret_key IS 'Secret key for signature verification';
COMMENT ON COLUMN webhooks.handler_name IS 'Handler function name in handlers.ts';
COMMENT ON COLUMN webhooks.event_type_prefix IS 'Event type prefix for Event System (e.g., webhook:github)';

-- ============================================================
-- Table: webhook_logs
-- ============================================================
-- Webhook audit log (all received webhooks)
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Webhook information
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  webhook_name TEXT NOT NULL,                   -- webhooks.name snapshot

  -- Request information
  request_method TEXT NOT NULL DEFAULT 'POST',
  request_headers JSONB NOT NULL,               -- All request headers
  request_body JSONB NOT NULL,                  -- Request body
  source_ip TEXT,                               -- Source IP address

  -- Processing result
  status TEXT NOT NULL CHECK (status IN ('success', 'signature_failed', 'handler_failed', 'not_found')),
  error_message TEXT,
  processing_time_ms INTEGER,                   -- Processing time (milliseconds)

  -- Event System integration
  system_event_id UUID REFERENCES system_events(id) ON DELETE SET NULL,

  -- Timestamp
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_webhook_name ON webhook_logs(webhook_name);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_webhook_logs_received_at ON webhook_logs(received_at DESC);
CREATE INDEX idx_webhook_logs_system_event_id ON webhook_logs(system_event_id);

COMMENT ON TABLE webhook_logs IS 'Webhook audit log (all received webhooks)';
COMMENT ON COLUMN webhook_logs.status IS 'success | signature_failed | handler_failed | not_found';

-- ============================================================
-- RLS: webhooks table
-- ============================================================
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- Admin can read webhooks
CREATE POLICY "Admin can read webhooks"
  ON webhooks
  FOR SELECT
  USING ((SELECT is_admin()) = true);

-- Admin can manage webhooks
CREATE POLICY "Admin can manage webhooks"
  ON webhooks
  FOR ALL
  USING ((SELECT is_admin()) = true)
  WITH CHECK ((SELECT is_admin()) = true);

-- ============================================================
-- RLS: webhook_logs table
-- ============================================================
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Admin can read webhook_logs
CREATE POLICY "Admin can read webhook_logs"
  ON webhook_logs
  FOR SELECT
  USING ((SELECT is_admin()) = true);

-- Service role can insert webhook_logs (Edge Function)
CREATE POLICY "Service role can insert webhook_logs"
  ON webhook_logs
  FOR INSERT
  WITH CHECK (true);  -- Service Role bypasses RLS

-- ============================================================
-- Initial Webhook Endpoints
-- ============================================================
INSERT INTO webhooks (name, provider, description, secret_key, handler_name, event_type_prefix) VALUES
  (
    'github-push',
    'github',
    'GitHub Push events (commits, branches)',
    'CHANGE_ME_AFTER_DEPLOYMENT',
    'github-push',
    'webhook:github'
  ),
  (
    'stripe-payment-succeeded',
    'stripe',
    'Stripe payment succeeded events',
    'CHANGE_ME_AFTER_DEPLOYMENT',
    'stripe-payment-succeeded',
    'webhook:stripe'
  ),
  (
    'slack-interactive',
    'slack',
    'Slack interactive message actions',
    'CHANGE_ME_AFTER_DEPLOYMENT',
    'slack-interactive',
    'webhook:slack'
  );

-- Note: Run this after deployment to set real secret keys:
-- UPDATE webhooks SET secret_key = 'your-real-secret' WHERE name = 'github-push';
