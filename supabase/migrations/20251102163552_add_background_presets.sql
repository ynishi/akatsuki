-- Add background category to character_presets

-- Update CHECK constraint to include 'background'
ALTER TABLE character_presets DROP CONSTRAINT IF EXISTS character_presets_category_check;

ALTER TABLE character_presets ADD CONSTRAINT character_presets_category_check
  CHECK (category IN ('hairstyle', 'body_type', 'costume', 'expression', 'hair_color', 'eye_color', 'accessory', 'background'));

-- Insert background presets
INSERT INTO character_presets (category, name, prompt_en, display_order) VALUES
  ('background', 'Simple White', 'simple white background', 1),
  ('background', 'Gradient', 'gradient background', 2),
  ('background', 'Indoor Room', 'indoor room background', 3),
  ('background', 'Outdoor Nature', 'outdoor nature background, trees, sky', 4),
  ('background', 'City Street', 'city street background, urban', 5),
  ('background', 'Beach', 'beach background, ocean, sand', 6),
  ('background', 'Forest', 'forest background, trees, nature', 7),
  ('background', 'Night Sky', 'night sky background, stars, moon', 8),
  ('background', 'Abstract', 'abstract background', 9),
  ('background', 'Random', 'RANDOM', 98),
  ('background', 'No Preference', 'NONE', 99);
