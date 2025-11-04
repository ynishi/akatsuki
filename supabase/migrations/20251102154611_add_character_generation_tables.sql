-- Character Generation Tables

-- 1. character_presets (Preset Master Data)
CREATE TABLE character_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('hairstyle', 'body_type', 'costume', 'expression', 'hair_color', 'eye_color', 'accessory')),
  name text NOT NULL,
  prompt_en text NOT NULL,
  thumbnail_url text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for category and display_order
CREATE INDEX idx_character_presets_category ON character_presets(category, display_order);

-- 2. character_generations (Generation History)
CREATE TABLE character_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id uuid REFERENCES files(id) ON DELETE SET NULL,
  preset_ids uuid[] NOT NULL DEFAULT '{}',
  custom_prompt text,
  translated_prompt text,
  final_prompt text NOT NULL,
  comfy_workflow_id text,
  comfy_model_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for user_id and created_at (for gallery query)
CREATE INDEX idx_character_generations_user_created ON character_generations(user_id, created_at DESC);

-- RLS Policies for character_presets
ALTER TABLE character_presets ENABLE ROW LEVEL SECURITY;

-- Everyone can view presets (master data)
CREATE POLICY "character_presets_select_all"
  ON character_presets
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for character_generations
ALTER TABLE character_generations ENABLE ROW LEVEL SECURITY;

-- Users can view only their own generations
CREATE POLICY "character_generations_select_own"
  ON character_generations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own generations
CREATE POLICY "character_generations_insert_own"
  ON character_generations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own generations
CREATE POLICY "character_generations_delete_own"
  ON character_generations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE character_presets IS 'Character generation preset master data';
COMMENT ON TABLE character_generations IS 'Character generation history per user';
