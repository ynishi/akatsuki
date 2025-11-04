-- Seed Character Presets Master Data

-- Hairstyle Presets
INSERT INTO character_presets (category, name, prompt_en, display_order) VALUES
  ('hairstyle', 'Short Hair', 'short hair', 1),
  ('hairstyle', 'Long Hair', 'long hair', 2),
  ('hairstyle', 'Twin Tails', 'twin tails hairstyle', 3),
  ('hairstyle', 'Ponytail', 'ponytail hairstyle', 4),
  ('hairstyle', 'Bob Cut', 'bob cut hairstyle', 5),
  ('hairstyle', 'Wavy Hair', 'wavy hair', 6),
  ('hairstyle', 'Braided Hair', 'braided hair', 7),
  ('hairstyle', 'Random', 'RANDOM', 98),
  ('hairstyle', 'No Preference', 'NONE', 99);

-- Body Type Presets
INSERT INTO character_presets (category, name, prompt_en, display_order) VALUES
  ('body_type', 'Slim', 'slim body type', 1),
  ('body_type', 'Average', 'average body type', 2),
  ('body_type', 'Curvy', 'curvy body type', 3),
  ('body_type', 'Athletic', 'athletic body type', 4),
  ('body_type', 'Petite', 'petite body type', 5),
  ('body_type', 'Random', 'RANDOM', 98),
  ('body_type', 'No Preference', 'NONE', 99);

-- Costume Presets
INSERT INTO character_presets (category, name, prompt_en, display_order) VALUES
  ('costume', 'Casual Clothes', 'casual clothes', 1),
  ('costume', 'School Uniform', 'school uniform', 2),
  ('costume', 'Fantasy Armor', 'fantasy armor', 3),
  ('costume', 'Maid Outfit', 'maid outfit', 4),
  ('costume', 'Kimono', 'traditional kimono', 5),
  ('costume', 'Modern Fashion', 'modern fashion outfit', 6),
  ('costume', 'Business Suit', 'business suit', 7),
  ('costume', 'Summer Dress', 'summer dress', 8),
  ('costume', 'Gothic Lolita', 'gothic lolita fashion', 9),
  ('costume', 'Random', 'RANDOM', 98),
  ('costume', 'No Preference', 'NONE', 99);

-- Expression Presets
INSERT INTO character_presets (category, name, prompt_en, display_order) VALUES
  ('expression', 'Smiling', 'smiling expression', 1),
  ('expression', 'Serious', 'serious expression', 2),
  ('expression', 'Shy', 'shy expression', 3),
  ('expression', 'Confident', 'confident expression', 4),
  ('expression', 'Surprised', 'surprised expression', 5),
  ('expression', 'Cheerful', 'cheerful expression', 6),
  ('expression', 'Mysterious', 'mysterious expression', 7),
  ('expression', 'Random', 'RANDOM', 98),
  ('expression', 'No Preference', 'NONE', 99);

-- Hair Color Presets
INSERT INTO character_presets (category, name, prompt_en, display_order) VALUES
  ('hair_color', 'Black Hair', 'black hair', 1),
  ('hair_color', 'Brown Hair', 'brown hair', 2),
  ('hair_color', 'Blonde Hair', 'blonde hair', 3),
  ('hair_color', 'Red Hair', 'red hair', 4),
  ('hair_color', 'Blue Hair', 'blue hair', 5),
  ('hair_color', 'Pink Hair', 'pink hair', 6),
  ('hair_color', 'Purple Hair', 'purple hair', 7),
  ('hair_color', 'Silver Hair', 'silver hair', 8),
  ('hair_color', 'White Hair', 'white hair', 9),
  ('hair_color', 'Random', 'RANDOM', 98),
  ('hair_color', 'No Preference', 'NONE', 99);

-- Eye Color Presets
INSERT INTO character_presets (category, name, prompt_en, display_order) VALUES
  ('eye_color', 'Brown Eyes', 'brown eyes', 1),
  ('eye_color', 'Blue Eyes', 'blue eyes', 2),
  ('eye_color', 'Green Eyes', 'green eyes', 3),
  ('eye_color', 'Red Eyes', 'red eyes', 4),
  ('eye_color', 'Purple Eyes', 'purple eyes', 5),
  ('eye_color', 'Golden Eyes', 'golden eyes', 6),
  ('eye_color', 'Amber Eyes', 'amber eyes', 7),
  ('eye_color', 'Random', 'RANDOM', 98),
  ('eye_color', 'No Preference', 'NONE', 99);

-- Accessory Presets
INSERT INTO character_presets (category, name, prompt_en, display_order) VALUES
  ('accessory', 'None', 'no accessories', 1),
  ('accessory', 'Glasses', 'wearing glasses', 2),
  ('accessory', 'Hair Ribbon', 'hair ribbon', 3),
  ('accessory', 'Necklace', 'wearing necklace', 4),
  ('accessory', 'Earrings', 'wearing earrings', 5),
  ('accessory', 'Hat', 'wearing hat', 6),
  ('accessory', 'Headband', 'wearing headband', 7),
  ('accessory', 'Hair Clips', 'hair clips', 8),
  ('accessory', 'Random', 'RANDOM', 98),
  ('accessory', 'No Preference', 'NONE', 99);
