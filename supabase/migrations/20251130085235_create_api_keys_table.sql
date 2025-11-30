-- Create api_keys table for Public API Gateway
-- API Key based authentication for external API access

-- =============================================================================
-- 1. api_keys table (API Key management)
-- =============================================================================

CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiers
  name text NOT NULL,                    -- API Key name (for management)
  description text,                      -- Description
  key_prefix text NOT NULL,              -- Prefix for display (ak_xxxxxx)
  key_hash text NOT NULL UNIQUE,         -- SHA-256 hash (for validation)

  -- Target entity
  entity_name text NOT NULL,             -- Target Entity (e.g., "Article")
  table_name text NOT NULL,              -- Target table (e.g., "articles")

  -- Permissions
  allowed_operations text[] NOT NULL     -- Allowed operations ['list', 'get', 'create', 'update', 'delete']
    DEFAULT ARRAY['list', 'get'],

  -- Rate Limiting
  rate_limit_per_minute integer DEFAULT 60,
  rate_limit_per_day integer DEFAULT 10000,

  -- Statistics
  request_count bigint DEFAULT 0 NOT NULL,
  last_used_at timestamptz,

  -- State management
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz,                -- NULL = no expiration
  is_active boolean DEFAULT true NOT NULL,

  -- Constraints
  CONSTRAINT valid_key_prefix CHECK (key_prefix ~ '^ak_[a-zA-Z0-9]{6}$'),
  CONSTRAINT valid_operations CHECK (
    allowed_operations <@ ARRAY['list', 'get', 'create', 'update', 'delete']::text[]
  )
);

-- Indexes
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_owner ON api_keys(owner_id);
CREATE INDEX idx_api_keys_entity ON api_keys(entity_name);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;
CREATE INDEX idx_api_keys_expires ON api_keys(expires_at) WHERE expires_at IS NOT NULL;

-- =============================================================================
-- 2. api_key_usage table (Rate Limiting)
-- =============================================================================

CREATE TABLE api_key_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

  -- Time window
  window_start timestamptz NOT NULL,
  window_type text NOT NULL CHECK (window_type IN ('minute', 'day')),

  -- Counter
  request_count integer DEFAULT 1 NOT NULL,

  UNIQUE (api_key_id, window_start, window_type)
);

CREATE INDEX idx_api_key_usage_lookup
  ON api_key_usage(api_key_id, window_type, window_start DESC);

-- =============================================================================
-- 3. RLS Policies
-- =============================================================================

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage ENABLE ROW LEVEL SECURITY;

-- api_keys policies
CREATE POLICY "Users can view own API keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own API keys"
  ON api_keys FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own API keys"
  ON api_keys FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own API keys"
  ON api_keys FOR DELETE
  USING (auth.uid() = owner_id);

-- api_key_usage policies (only service_role can access)
CREATE POLICY "Service role can manage usage"
  ON api_key_usage FOR ALL
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 4. Triggers
-- =============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_api_keys_updated_at_trigger
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_api_keys_updated_at();

-- =============================================================================
-- 5. Helper Functions
-- =============================================================================

-- Increment request count (called from api-gateway)
CREATE OR REPLACE FUNCTION increment_api_key_usage(
  p_api_key_id uuid,
  p_window_type text,
  p_window_start timestamptz
)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO api_key_usage (api_key_id, window_type, window_start, request_count)
  VALUES (p_api_key_id, p_window_type, p_window_start, 1)
  ON CONFLICT (api_key_id, window_start, window_type)
  DO UPDATE SET request_count = api_key_usage.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update API key stats (called from api-gateway)
CREATE OR REPLACE FUNCTION update_api_key_stats(p_api_key_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE api_keys
  SET
    request_count = request_count + 1,
    last_used_at = now()
  WHERE id = p_api_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old usage records (call from pg_cron or scheduled job)
CREATE OR REPLACE FUNCTION cleanup_old_api_key_usage()
RETURNS integer AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM api_key_usage
  WHERE window_start < now() - interval '2 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 6. Comments
-- =============================================================================

COMMENT ON TABLE api_keys IS 'API Keys for Public API Gateway authentication';
COMMENT ON COLUMN api_keys.name IS 'Human-readable name for the API key';
COMMENT ON COLUMN api_keys.key_prefix IS 'Visible prefix (ak_xxxxxx) for identification in UI';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the full API key for secure validation';
COMMENT ON COLUMN api_keys.entity_name IS 'Target entity name (e.g., Article, Product)';
COMMENT ON COLUMN api_keys.table_name IS 'Target database table (e.g., articles, products)';
COMMENT ON COLUMN api_keys.allowed_operations IS 'Array of allowed CRUD operations';
COMMENT ON COLUMN api_keys.rate_limit_per_minute IS 'Maximum requests per minute';
COMMENT ON COLUMN api_keys.rate_limit_per_day IS 'Maximum requests per day';
COMMENT ON COLUMN api_keys.expires_at IS 'Expiration timestamp (NULL = never expires)';
COMMENT ON COLUMN api_keys.is_active IS 'Active status (can be toggled for immediate disable)';

COMMENT ON TABLE api_key_usage IS 'Rate limiting counters for API keys';
COMMENT ON COLUMN api_key_usage.window_type IS 'Time window type: minute or day';
COMMENT ON COLUMN api_key_usage.window_start IS 'Start of the time window';

COMMENT ON FUNCTION increment_api_key_usage IS 'Atomically increment usage counter for rate limiting';
COMMENT ON FUNCTION update_api_key_stats IS 'Update API key statistics (request count, last used)';
COMMENT ON FUNCTION cleanup_old_api_key_usage IS 'Remove usage records older than 2 days';
