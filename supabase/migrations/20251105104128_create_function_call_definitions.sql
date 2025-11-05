-- Function Call Definitions Table
-- LLMに注入するFunction Callのスキーマ定義を管理
-- 実行ロジックは別の層（Job Handler / Webhook / 独自実装）で実装

-- ============================================================
-- Table: function_call_definitions
-- ============================================================
CREATE TABLE function_call_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner (NULL = global function)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Function metadata
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  parameters_schema JSONB NOT NULL, -- JSON Schema for function parameters

  -- Event integration
  target_event_type TEXT NOT NULL, -- e.g., 'job:send_webhook'

  -- Configuration
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_global BOOLEAN NOT NULL DEFAULT false, -- Available to all users

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_function_per_user UNIQUE(user_id, name)
);

-- Partial unique index for global functions
CREATE UNIQUE INDEX unique_global_function_name ON function_call_definitions(name) WHERE is_global = true;

-- Indexes
CREATE INDEX idx_function_call_definitions_user_id ON function_call_definitions(user_id);
CREATE INDEX idx_function_call_definitions_name ON function_call_definitions(name);
CREATE INDEX idx_function_call_definitions_enabled ON function_call_definitions(is_enabled);
CREATE INDEX idx_function_call_definitions_global ON function_call_definitions(is_global) WHERE is_global = true;

-- Updated_at trigger
CREATE TRIGGER set_function_call_definitions_updated_at
  BEFORE UPDATE ON function_call_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE function_call_definitions IS 'Function Call schema definitions for LLM Function Calling';
COMMENT ON COLUMN function_call_definitions.parameters_schema IS 'JSON Schema defining function parameters';
COMMENT ON COLUMN function_call_definitions.target_event_type IS 'Event type to emit when this function is called (e.g., job:send_webhook)';
COMMENT ON COLUMN function_call_definitions.is_global IS 'If true, available to all users; if false, only to user_id';

-- ============================================================
-- RLS: function_call_definitions
-- ============================================================
ALTER TABLE function_call_definitions ENABLE ROW LEVEL SECURITY;

-- Users can read their own functions + global functions
CREATE POLICY "Users can read own and global function_call_definitions"
  ON function_call_definitions
  FOR SELECT
  USING (user_id = auth.uid() OR is_global = true);

-- Users can create their own functions
CREATE POLICY "Users can create own function_call_definitions"
  ON function_call_definitions
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_global = false);

-- Users can update their own functions
CREATE POLICY "Users can update own function_call_definitions"
  ON function_call_definitions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own functions
CREATE POLICY "Users can delete own function_call_definitions"
  ON function_call_definitions
  FOR DELETE
  USING (user_id = auth.uid());

-- Admin can manage all functions
CREATE POLICY "Admin can manage all function_call_definitions"
  ON function_call_definitions
  FOR ALL
  USING ((SELECT is_admin()) = true)
  WITH CHECK ((SELECT is_admin()) = true);

-- Service role can manage all (Edge Functions)
CREATE POLICY "Service role can manage function_call_definitions"
  ON function_call_definitions
  FOR ALL
  WITH CHECK (true); -- Service Role bypasses RLS

-- ============================================================
-- Seed: Sample Global Functions
-- ============================================================

-- Function: send_webhook
INSERT INTO function_call_definitions (
  user_id,
  name,
  description,
  parameters_schema,
  target_event_type,
  is_enabled,
  is_global
) VALUES (
  NULL,
  'send_webhook',
  'Send HTTP webhook to an external service with custom payload',
  '{
    "type": "object",
    "properties": {
      "url": {
        "type": "string",
        "description": "The webhook URL to send the request to"
      },
      "method": {
        "type": "string",
        "enum": ["GET", "POST", "PUT", "PATCH", "DELETE"],
        "description": "HTTP method",
        "default": "POST"
      },
      "headers": {
        "type": "object",
        "description": "Custom HTTP headers",
        "additionalProperties": { "type": "string" }
      },
      "body": {
        "type": "object",
        "description": "Request body payload"
      }
    },
    "required": ["url"]
  }'::jsonb,
  'job:send_webhook',
  true,
  true
);

-- Function: query_database
INSERT INTO function_call_definitions (
  user_id,
  name,
  description,
  parameters_schema,
  target_event_type,
  is_enabled,
  is_global
) VALUES (
  NULL,
  'query_database',
  'Execute a read-only database query using Supabase (respects RLS)',
  '{
    "type": "object",
    "properties": {
      "table": {
        "type": "string",
        "description": "The table name to query"
      },
      "filters": {
        "type": "object",
        "description": "Filter conditions (key-value pairs)",
        "additionalProperties": true
      },
      "select": {
        "type": "string",
        "description": "Columns to select",
        "default": "*"
      },
      "limit": {
        "type": "integer",
        "description": "Maximum number of results",
        "default": 10
      }
    },
    "required": ["table"]
  }'::jsonb,
  'job:query_database',
  true,
  true
);

-- Function: send_notification
INSERT INTO function_call_definitions (
  user_id,
  name,
  description,
  parameters_schema,
  target_event_type,
  is_enabled,
  is_global
) VALUES (
  NULL,
  'send_notification',
  'Send a notification to the user (email, push, or in-app)',
  '{
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "enum": ["email", "push", "in_app"],
        "description": "Notification type"
      },
      "title": {
        "type": "string",
        "description": "Notification title"
      },
      "message": {
        "type": "string",
        "description": "Notification message"
      },
      "recipients": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Recipient user IDs (defaults to current user)"
      }
    },
    "required": ["type", "title", "message"]
  }'::jsonb,
  'job:send_notification',
  true,
  true
);

-- Function: generate_image
INSERT INTO function_call_definitions (
  user_id,
  name,
  description,
  parameters_schema,
  target_event_type,
  is_enabled,
  is_global
) VALUES (
  NULL,
  'generate_image',
  'Generate an image using AI (DALL-E, Stable Diffusion, etc.)',
  '{
    "type": "object",
    "properties": {
      "prompt": {
        "type": "string",
        "description": "The image generation prompt"
      },
      "size": {
        "type": "string",
        "enum": ["256x256", "512x512", "1024x1024", "1024x1792", "1792x1024"],
        "description": "Image size",
        "default": "1024x1024"
      },
      "quality": {
        "type": "string",
        "enum": ["standard", "hd"],
        "description": "Image quality",
        "default": "standard"
      },
      "style": {
        "type": "string",
        "enum": ["vivid", "natural"],
        "description": "Image style",
        "default": "vivid"
      }
    },
    "required": ["prompt"]
  }'::jsonb,
  'job:generate_image',
  true,
  true
);

-- Function: aggregate_data
INSERT INTO function_call_definitions (
  user_id,
  name,
  description,
  parameters_schema,
  target_event_type,
  is_enabled,
  is_global
) VALUES (
  NULL,
  'aggregate_data',
  'Perform data aggregation and analysis on database tables',
  '{
    "type": "object",
    "properties": {
      "table": {
        "type": "string",
        "description": "The table name to aggregate"
      },
      "operation": {
        "type": "string",
        "enum": ["count", "sum", "avg", "min", "max"],
        "description": "Aggregation operation"
      },
      "column": {
        "type": "string",
        "description": "Column to aggregate (not needed for count)"
      },
      "groupBy": {
        "type": "string",
        "description": "Column to group by"
      },
      "filters": {
        "type": "object",
        "description": "Filter conditions before aggregation",
        "additionalProperties": true
      }
    },
    "required": ["table", "operation"]
  }'::jsonb,
  'job:aggregate_data',
  true,
  true
);
