-- LLM Quota System Migration
-- Simple quota-based usage management with append-only logs

-- 1. llm_call_logs: Lightweight call history (append-only)
CREATE TABLE IF NOT EXISTS llm_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'gemini')),
  model_id TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  request_type TEXT NOT NULL DEFAULT 'chat' CHECK (request_type IN ('chat', 'image', 'embed')),
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_llm_call_logs_user_id ON llm_call_logs(user_id);
CREATE INDEX idx_llm_call_logs_created_at ON llm_call_logs(created_at DESC);
CREATE INDEX idx_llm_call_logs_user_created ON llm_call_logs(user_id, created_at DESC);

ALTER TABLE llm_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own call logs"
  ON llm_call_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all call logs"
  ON llm_call_logs FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- 2. user_quotas: Simple quota management
CREATE TABLE IF NOT EXISTS user_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'enterprise')),
  monthly_request_limit INTEGER NOT NULL DEFAULT 100,
  current_month TEXT NOT NULL,
  requests_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, current_month)
);

CREATE INDEX idx_user_quotas_user_month ON user_quotas(user_id, current_month);

ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quota"
  ON user_quotas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all quotas"
  ON user_quotas FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE OR REPLACE FUNCTION update_user_quotas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_quotas_updated_at
  BEFORE UPDATE ON user_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_user_quotas_updated_at();

-- 3. Helper views
CREATE OR REPLACE VIEW user_monthly_stats AS
SELECT
  l.user_id,
  DATE_TRUNC('month', l.created_at)::DATE AS month,
  COUNT(*) AS total_calls,
  SUM(CASE WHEN l.success THEN 1 ELSE 0 END) AS successful_calls,
  SUM(COALESCE(l.total_tokens, l.input_tokens + l.output_tokens, 0)) AS total_tokens_used
FROM llm_call_logs l
GROUP BY l.user_id, DATE_TRUNC('month', l.created_at);

CREATE OR REPLACE VIEW user_current_usage AS
SELECT
  q.user_id,
  q.plan_type,
  q.monthly_request_limit,
  q.requests_used,
  q.monthly_request_limit - q.requests_used AS remaining_requests,
  ROUND((q.requests_used::NUMERIC / q.monthly_request_limit) * 100, 2) AS usage_percentage,
  q.current_month,
  q.updated_at AS last_updated
FROM user_quotas q
WHERE q.current_month = TO_CHAR(NOW(), 'YYYY-MM');

ALTER VIEW user_monthly_stats SET (security_invoker = true);
ALTER VIEW user_current_usage SET (security_invoker = true);

COMMENT ON TABLE llm_call_logs IS 'Append-only log of all LLM API calls';
COMMENT ON TABLE user_quotas IS 'Monthly quota limits for LLM API usage';
COMMENT ON VIEW user_monthly_stats IS 'Aggregated monthly statistics per user';
COMMENT ON VIEW user_current_usage IS 'Current month usage status with remaining quota';
