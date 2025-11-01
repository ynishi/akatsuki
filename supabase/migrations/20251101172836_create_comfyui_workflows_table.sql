-- ComfyUI Workflows Table
-- Workflows managed by admins, readable by all users

-- 1. Create table
CREATE TABLE IF NOT EXISTS comfyui_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  name TEXT NOT NULL,
  description TEXT,

  -- Workflow JSON
  workflow_json JSONB NOT NULL,

  -- Configuration
  default_params JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Search tags
  tags TEXT[] DEFAULT '{}'
);

-- 2. Create indexes
CREATE INDEX idx_comfyui_workflows_is_active ON comfyui_workflows(is_active);
CREATE INDEX idx_comfyui_workflows_is_default ON comfyui_workflows(is_default);
CREATE INDEX idx_comfyui_workflows_tags ON comfyui_workflows USING GIN(tags);
CREATE INDEX idx_comfyui_workflows_created_at ON comfyui_workflows(created_at DESC);

-- 3. Enable RLS
ALTER TABLE comfyui_workflows ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies

-- Anyone can read active workflows
CREATE POLICY "Anyone can read active workflows"
  ON comfyui_workflows
  FOR SELECT
  USING (is_active = true);

-- Only admins can insert workflows
-- Note: Admin check uses raw_user_meta_data->>'role' = 'admin'
CREATE POLICY "Only admins can insert workflows"
  ON comfyui_workflows
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Only admins can update workflows
CREATE POLICY "Only admins can update workflows"
  ON comfyui_workflows
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Only admins can delete workflows (soft delete with is_active=false recommended)
CREATE POLICY "Only admins can delete workflows"
  ON comfyui_workflows
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 5. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_comfyui_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comfyui_workflows_updated_at
  BEFORE UPDATE ON comfyui_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_comfyui_workflows_updated_at();

-- 6. Default workflow constraint (only one is_default=true allowed)
CREATE OR REPLACE FUNCTION check_single_default_workflow()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Set existing defaults to false
    UPDATE comfyui_workflows
    SET is_default = false
    WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_single_default_workflow
  BEFORE INSERT OR UPDATE ON comfyui_workflows
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION check_single_default_workflow();

-- 7. Insert sample workflow (SDXL Basic)
INSERT INTO comfyui_workflows (name, description, workflow_json, is_default, tags, created_by)
VALUES (
  'SDXL Basic Text-to-Image',
  'Stable Diffusion XL basic text-to-image workflow',
  '{
    "3": {
      "inputs": {
        "seed": 0,
        "steps": 20,
        "cfg": 7.0,
        "sampler_name": "euler",
        "scheduler": "normal",
        "denoise": 1.0,
        "model": ["4", 0],
        "positive": ["6", 0],
        "negative": ["7", 0],
        "latent_image": ["5", 0]
      },
      "class_type": "KSampler"
    },
    "4": {
      "inputs": {
        "ckpt_name": "sd_xl_base_1.0.safetensors"
      },
      "class_type": "CheckpointLoaderSimple"
    },
    "5": {
      "inputs": {
        "width": 1024,
        "height": 1024,
        "batch_size": 1
      },
      "class_type": "EmptyLatentImage"
    },
    "6": {
      "inputs": {
        "text": "{{prompt}}",
        "clip": ["4", 1]
      },
      "class_type": "CLIPTextEncode"
    },
    "7": {
      "inputs": {
        "text": "text, watermark, low quality",
        "clip": ["4", 1]
      },
      "class_type": "CLIPTextEncode"
    },
    "8": {
      "inputs": {
        "samples": ["3", 0],
        "vae": ["4", 2]
      },
      "class_type": "VAEDecode"
    },
    "9": {
      "inputs": {
        "filename_prefix": "ComfyUI",
        "images": ["8", 0]
      },
      "class_type": "SaveImage"
    }
  }'::jsonb,
  true,
  ARRAY['text-to-image', 'sdxl', 'basic'],
  NULL
);

-- 8. Add comments
COMMENT ON TABLE comfyui_workflows IS 'ComfyUI workflow definitions managed by admins';
COMMENT ON COLUMN comfyui_workflows.workflow_json IS 'ComfyUI workflow JSON. Use {{prompt}} as placeholder for dynamic prompt injection';
COMMENT ON COLUMN comfyui_workflows.default_params IS 'Default parameters like size, quality, etc.';
COMMENT ON COLUMN comfyui_workflows.is_default IS 'Only one workflow can be default at a time';
COMMENT ON COLUMN comfyui_workflows.tags IS 'Search tags like ["text-to-image", "anime", "realistic"]';
