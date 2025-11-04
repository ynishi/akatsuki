-- Add generation_settings column to character_generations table
-- This stores ComfyUI generation parameters (promptPrefix, size, steps, cfg)

ALTER TABLE character_generations ADD COLUMN generation_settings jsonb;

COMMENT ON COLUMN character_generations.generation_settings IS 'ComfyUI generation settings (promptPrefix, size, steps, cfg, etc)';
