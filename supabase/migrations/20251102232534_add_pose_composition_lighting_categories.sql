-- Add new categories to character_presets: pose, composition, lighting
-- Drop and recreate the CHECK constraint to include new categories

ALTER TABLE character_presets
DROP CONSTRAINT IF EXISTS character_presets_category_check;

ALTER TABLE character_presets
ADD CONSTRAINT character_presets_category_check
CHECK (category IN (
  'hairstyle',
  'body_type',
  'costume',
  'expression',
  'hair_color',
  'eye_color',
  'accessory',
  'background',
  'pose',
  'composition',
  'lighting'
));

COMMENT ON CONSTRAINT character_presets_category_check ON character_presets IS 'Valid categories: hairstyle, body_type, costume, expression, hair_color, eye_color, accessory, background, pose, composition, lighting';
