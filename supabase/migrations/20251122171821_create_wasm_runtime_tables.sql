-- ============================================================================
-- WASM Runtime Tables Migration
-- ============================================================================
-- wasm_modules: WASM module metadata management
-- wasm_executions: WASM execution history and audit logs
-- ============================================================================

-- ============================================================================
-- Create wasm_modules table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.wasm_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Storage reference (WASM files stored in private_uploads)
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,

  -- Module information
  module_name text NOT NULL,
  description text,
  version text NOT NULL DEFAULT '1.0.0',

  -- WASM metadata
  wasm_size_bytes bigint NOT NULL,
  exported_functions jsonb NOT NULL DEFAULT '[]'::jsonb, -- ["add", "multiply", ...]
  memory_pages integer NOT NULL DEFAULT 1, -- Initial memory pages (1 page = 64KB)
  max_memory_pages integer, -- Max memory pages (null = unlimited)

  -- Execution settings
  timeout_ms integer NOT NULL DEFAULT 5000, -- Default 5s timeout
  max_execution_time_ms integer NOT NULL DEFAULT 30000, -- Absolute max 30s

  -- Permissions
  is_public boolean NOT NULL DEFAULT false, -- true: other users can execute
  allowed_users uuid[] DEFAULT ARRAY[]::uuid[], -- Specific users allowed

  -- Status
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('uploading', 'active', 'disabled', 'error')),

  -- Custom metadata
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_wasm_modules_owner_id ON public.wasm_modules(owner_id);
CREATE INDEX idx_wasm_modules_file_id ON public.wasm_modules(file_id);
CREATE INDEX idx_wasm_modules_module_name ON public.wasm_modules(module_name);
CREATE INDEX idx_wasm_modules_is_public ON public.wasm_modules(is_public);
CREATE INDEX idx_wasm_modules_status ON public.wasm_modules(status);
CREATE INDEX idx_wasm_modules_created_at ON public.wasm_modules(created_at DESC);

-- Unique constraint (owner + module_name + version)
CREATE UNIQUE INDEX idx_wasm_modules_unique_name_version
  ON public.wasm_modules(owner_id, module_name, version);

-- Auto-update updated_at
CREATE TRIGGER trigger_update_wasm_modules_updated_at
  BEFORE UPDATE ON public.wasm_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_files_updated_at(); -- Reuse existing function

-- Comments
COMMENT ON TABLE public.wasm_modules IS 'WASM module metadata management';
COMMENT ON COLUMN public.wasm_modules.owner_id IS 'Module owner user ID';
COMMENT ON COLUMN public.wasm_modules.file_id IS 'Reference to files table (WASM binary)';
COMMENT ON COLUMN public.wasm_modules.exported_functions IS 'List of exported function names (JSON array)';
COMMENT ON COLUMN public.wasm_modules.timeout_ms IS 'Default execution timeout in milliseconds';
COMMENT ON COLUMN public.wasm_modules.is_public IS 'If true, anyone can execute this module';
COMMENT ON COLUMN public.wasm_modules.allowed_users IS 'Array of user IDs allowed to execute (if not public)';

-- ============================================================================
-- Create wasm_executions table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.wasm_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Module reference
  module_id uuid NOT NULL REFERENCES public.wasm_modules(id) ON DELETE CASCADE,

  -- Executor
  executor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Execution details
  function_name text NOT NULL,
  input_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_result jsonb, -- Result on success

  -- Performance metrics
  execution_time_ms integer NOT NULL,
  memory_used_bytes bigint,

  -- Status
  status text NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  error_message text, -- Error message on failure

  -- Timestamp
  executed_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_wasm_executions_module_id ON public.wasm_executions(module_id);
CREATE INDEX idx_wasm_executions_executor_id ON public.wasm_executions(executor_id);
CREATE INDEX idx_wasm_executions_status ON public.wasm_executions(status);
CREATE INDEX idx_wasm_executions_executed_at ON public.wasm_executions(executed_at DESC);

-- Composite index (module + status)
CREATE INDEX idx_wasm_executions_module_status
  ON public.wasm_executions(module_id, status);

-- Comments
COMMENT ON TABLE public.wasm_executions IS 'WASM execution history and audit logs';
COMMENT ON COLUMN public.wasm_executions.module_id IS 'Reference to wasm_modules table';
COMMENT ON COLUMN public.wasm_executions.executor_id IS 'User who executed the WASM function';
COMMENT ON COLUMN public.wasm_executions.execution_time_ms IS 'Execution time in milliseconds';
COMMENT ON COLUMN public.wasm_executions.status IS 'success, error, or timeout';

-- ============================================================================
-- RLS Policies for wasm_modules
-- ============================================================================
ALTER TABLE public.wasm_modules ENABLE ROW LEVEL SECURITY;

-- Users can manage their own modules
CREATE POLICY "Users can manage their own modules"
  ON public.wasm_modules
  FOR ALL
  USING (owner_id = auth.uid());

-- Public modules are readable by anyone
CREATE POLICY "Public modules are readable by anyone"
  ON public.wasm_modules
  FOR SELECT
  USING (is_public = true AND status = 'active');

-- Allowed users can read shared modules
CREATE POLICY "Allowed users can read shared modules"
  ON public.wasm_modules
  FOR SELECT
  USING (auth.uid() = ANY(allowed_users) AND status = 'active');

-- Admins can manage all modules
CREATE POLICY "Admins can manage all modules"
  ON public.wasm_modules
  FOR ALL
  USING ((SELECT is_admin()) = true);

-- ============================================================================
-- RLS Policies for wasm_executions
-- ============================================================================
ALTER TABLE public.wasm_executions ENABLE ROW LEVEL SECURITY;

-- Users can read their own executions
CREATE POLICY "Users can read their own executions"
  ON public.wasm_executions
  FOR SELECT
  USING (executor_id = auth.uid());

-- Module owners can read executions
CREATE POLICY "Module owners can read executions"
  ON public.wasm_executions
  FOR SELECT
  USING (
    module_id IN (
      SELECT id FROM public.wasm_modules WHERE owner_id = auth.uid()
    )
  );

-- Authenticated users can insert executions
CREATE POLICY "Authenticated users can insert executions"
  ON public.wasm_executions
  FOR INSERT
  WITH CHECK (executor_id = auth.uid());

-- Admins can read all executions
CREATE POLICY "Admins can read all executions"
  ON public.wasm_executions
  FOR SELECT
  USING ((SELECT is_admin()) = true);
