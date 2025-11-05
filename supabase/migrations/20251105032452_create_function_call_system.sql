-- Function Call System: AI-driven function execution
-- Pattern: LLM Function Calling -> Function Execution (sync/async) -> Job System

-- ============================================================
-- Table: function_call_logs
-- ============================================================
-- Audit log for all function executions
CREATE TABLE function_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- LLM Call information
  llm_call_log_id UUID REFERENCES llm_call_logs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Function information
  function_name TEXT NOT NULL,
  function_arguments JSONB NOT NULL,
  execution_type TEXT NOT NULL CHECK (execution_type IN ('sync', 'async')),

  -- Execution result
  status TEXT NOT NULL CHECK (status IN ('pending', 'executing', 'success', 'failed')),
  result JSONB,
  error_message TEXT,

  -- Job integration (for async execution)
  system_event_id UUID REFERENCES system_events(id) ON DELETE SET NULL,

  -- Metrics
  execution_time_ms INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_function_call_logs_user_id ON function_call_logs(user_id);
CREATE INDEX idx_function_call_logs_function_name ON function_call_logs(function_name);
CREATE INDEX idx_function_call_logs_status ON function_call_logs(status);
CREATE INDEX idx_function_call_logs_llm_call_log_id ON function_call_logs(llm_call_log_id);
CREATE INDEX idx_function_call_logs_created_at ON function_call_logs(created_at DESC);

-- Updated_at trigger
CREATE TRIGGER set_function_call_logs_updated_at
  BEFORE UPDATE ON function_call_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE function_call_logs IS 'Function Call execution audit log';
COMMENT ON COLUMN function_call_logs.execution_type IS 'sync (immediate) or async (via Job System)';
COMMENT ON COLUMN function_call_logs.status IS 'pending | executing | success | failed';

-- ============================================================
-- RLS: function_call_logs table
-- ============================================================
ALTER TABLE function_call_logs ENABLE ROW LEVEL SECURITY;

-- Users can read own function_call_logs
CREATE POLICY "Users can read own function_call_logs"
  ON function_call_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Admin can read all function_call_logs
CREATE POLICY "Admin can read all function_call_logs"
  ON function_call_logs
  FOR SELECT
  USING ((SELECT is_admin()) = true);

-- Service role can manage function_call_logs (Edge Functions)
CREATE POLICY "Service role can manage function_call_logs"
  ON function_call_logs
  FOR ALL
  WITH CHECK (true);  -- Service Role bypasses RLS
