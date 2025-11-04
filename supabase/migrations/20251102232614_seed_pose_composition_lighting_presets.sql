-- Seed data for new categories: pose, composition, lighting

-- Pose Presets
INSERT INTO character_presets (category, name, prompt_en, display_order) VALUES
('pose', 'Random', 'RANDOM', 0),
('pose', 'No Preference', 'NONE', 1),
('pose', 'Standing', 'standing, standing pose', 10),
('pose', 'Sitting', 'sitting, sitting pose', 20),
('pose', 'Lying Down', 'lying down, lying on back', 30),
('pose', 'Kneeling', 'kneeling, on knees', 40),
('pose', 'Walking', 'walking, walking pose', 50),
('pose', 'Running', 'running, dynamic running pose', 60),
('pose', 'Dancing', 'dancing, dance pose', 70),
('pose', 'Crossed Arms', 'arms crossed, crossed arms pose', 80),
('pose', 'Hands on Hips', 'hands on hips', 90),
('pose', 'Peace Sign', 'peace sign, v sign, two fingers up', 100),
('pose', 'Waving', 'waving, waving hand', 110);

-- Composition/Camera Angle Presets
INSERT INTO character_presets (category, name, prompt_en, display_order) VALUES
('composition', 'Random', 'RANDOM', 0),
('composition', 'No Preference', 'NONE', 1),
('composition', 'Eye Level', 'eye level, straight on view', 10),
('composition', 'Low Angle', 'low angle shot, from below', 20),
('composition', 'High Angle', 'high angle shot, from above', 30),
('composition', 'Worm''s Eye View', 'worm''s eye view, extreme low angle', 40),
('composition', 'Bird''s Eye View', 'bird''s eye view, overhead shot, top down', 50),
('composition', 'Close-up', 'close-up, close up shot, face focus', 60),
('composition', 'Medium Shot', 'medium shot, waist up', 70),
('composition', 'Full Body', 'full body shot, full body view', 80),
('composition', 'Upper Body', 'upper body shot, from chest up', 90),
('composition', 'Cowboy Shot', 'cowboy shot, from thighs up', 100);

-- Lighting Presets
INSERT INTO character_presets (category, name, prompt_en, display_order) VALUES
('lighting', 'Random', 'RANDOM', 0),
('lighting', 'No Preference', 'NONE', 1),
('lighting', 'Volumetric', 'volumetric lighting, light beams, god rays', 10),
('lighting', 'Rim Lighting', 'rim lighting, rim light, edge lighting', 20),
('lighting', 'Backlight', 'backlight, backlighting, light from behind', 30),
('lighting', 'Dramatic', 'dramatic lighting, high contrast lighting', 40),
('lighting', 'Golden Hour', 'golden hour, warm sunset lighting', 50),
('lighting', 'Soft Lighting', 'soft lighting, diffused light, gentle illumination', 60),
('lighting', 'Studio Lighting', 'studio lighting, professional lighting setup', 70),
('lighting', 'Crepuscular Rays', 'crepuscular rays, sunbeams through clouds', 80),
('lighting', 'Two-Tone', 'two-tone lighting, split lighting', 90),
('lighting', 'Neon Glow', 'neon lighting, neon glow, colorful neon lights', 100);

COMMENT ON TABLE character_presets IS 'Character generation preset master data - now includes pose, composition, and lighting categories';
