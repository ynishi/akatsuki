-- Add 'comfyui' to llm_call_logs provider constraint

-- Drop old constraint
ALTER TABLE llm_call_logs DROP CONSTRAINT IF EXISTS llm_call_logs_provider_check;

-- Add new constraint with comfyui
ALTER TABLE llm_call_logs ADD CONSTRAINT llm_call_logs_provider_check 
  CHECK (provider IN ('openai', 'anthropic', 'gemini', 'comfyui'));
