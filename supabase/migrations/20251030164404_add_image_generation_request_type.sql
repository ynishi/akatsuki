-- ============================================================================
-- Add 'image_generation' to llm_call_logs request_type
-- ============================================================================
-- Allow image generation calls to be logged in llm_call_logs table
-- ============================================================================

-- Drop the existing check constraint
ALTER TABLE llm_call_logs
  DROP CONSTRAINT IF EXISTS llm_call_logs_request_type_check;

-- Add new check constraint with 'image_generation' included
ALTER TABLE llm_call_logs
  ADD CONSTRAINT llm_call_logs_request_type_check
  CHECK (request_type IN ('chat', 'image', 'embed', 'image_generation'));

-- Add comment
COMMENT ON COLUMN llm_call_logs.request_type IS 'Type of LLM request: chat, image, embed, image_generation';
