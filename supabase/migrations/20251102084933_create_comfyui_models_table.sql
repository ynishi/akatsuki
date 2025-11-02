-- ComfyUI Models Table
-- キャッシュとメタデータ管理用テーブル

-- 1. Create table
CREATE TABLE IF NOT EXISTS comfyui_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Model identification
  filename TEXT NOT NULL UNIQUE,
  display_name TEXT,
  description TEXT,

  -- Categorization
  category TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Metadata (拡張可能)
  model_type TEXT DEFAULT 'checkpoint',
  base_model TEXT,
  recommended_settings JSONB,

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Admin management
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_synced_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_category CHECK (category IN ('anime', 'pony', '3d', 'realistic', 'other', NULL)),
  CONSTRAINT valid_model_type CHECK (model_type IN ('checkpoint', 'lora', 'vae', 'embedding'))
);

-- 2. Create indexes
CREATE INDEX idx_comfyui_models_category ON comfyui_models(category) WHERE category IS NOT NULL;
CREATE INDEX idx_comfyui_models_is_active ON comfyui_models(is_active);
CREATE INDEX idx_comfyui_models_is_featured ON comfyui_models(is_featured) WHERE is_featured = true;
CREATE INDEX idx_comfyui_models_sort_order ON comfyui_models(sort_order);
CREATE INDEX idx_comfyui_models_usage_count ON comfyui_models(usage_count DESC);
CREATE INDEX idx_comfyui_models_tags ON comfyui_models USING GIN(tags);

-- 3. Enable RLS
ALTER TABLE comfyui_models ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies

-- Anyone can read active models
CREATE POLICY "Anyone can read active models"
  ON comfyui_models
  FOR SELECT
  USING (is_active = true);

-- Only admins can modify models
CREATE POLICY "Only admins can modify models"
  ON comfyui_models
  FOR ALL
  USING ((SELECT is_admin()) = true);

-- 5. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_comfyui_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comfyui_models_updated_at
  BEFORE UPDATE ON comfyui_models
  FOR EACH ROW
  EXECUTE FUNCTION update_comfyui_models_updated_at();

-- 6. Insert initial models with categorization
INSERT INTO comfyui_models (filename, display_name, category, tags, is_featured, sort_order) VALUES
  -- Anime category (featured)
  ('bismuthIllustrious_v30.safetensors', 'Bismuth Illustrious v3.0', 'anime', ARRAY['anime', 'illustrious'], true, 1),
  ('amanatsuIllustrious_v11.safetensors', 'Amanatsu Illustrious v1.1', 'anime', ARRAY['anime', 'illustrious'], true, 2),
  ('asyncsMIXILLUSTRIOUS_ilNV10.safetensors', 'AsyncsMIX ILLUSTRIOUS NV10', 'anime', ARRAY['anime', 'illustrious'], false, 3),
  ('novaAnimeXL_ilV100.safetensors', 'Nova Anime XL IL v1.00', 'anime', ARRAY['anime', 'sdxl'], false, 4),
  ('ilustmix_v9.safetensors', 'Ilustmix v9', 'anime', ARRAY['anime', 'mix'], false, 5),
  ('waiNSFWIllustrious_v140.safetensors', 'Wai NSFW Illustrious v1.40', 'anime', ARRAY['anime', 'illustrious', 'nsfw'], false, 6),
  
  -- Pony category
  ('boleromixPony_v220.safetensors', 'BoleromixPony v2.20', 'pony', ARRAY['pony', 'mix'], false, 10),
  ('hassakuXLPony_v13BetterEyesVersion.safetensors', 'Hassaku XL Pony v1.3 Better Eyes', 'pony', ARRAY['pony', 'sdxl'], false, 11),
  ('asianBlendPDXLPony_v1.safetensors', 'Asian Blend PDXL Pony v1', 'pony', ARRAY['pony', 'asian'], false, 12),
  ('moonmilkContrastIL_ponyV2.safetensors', 'Moonmilk Contrast IL Pony v2', 'pony', ARRAY['pony', 'contrast'], false, 13),
  
  -- 3D category
  ('3dStock3dAnimeStyle_v20.safetensors', '3D Stock 3D Anime Style v2.0', '3d', ARRAY['3d', 'anime'], false, 20),
  ('novaAnime3dXL_v40.safetensors', 'Nova Anime 3D XL v4.0', '3d', ARRAY['3d', 'anime'], false, 21),
  
  -- Realistic category
  ('smthmixSemiReal_v3.safetensors', 'Smthmix Semi-Real v3', 'realistic', ARRAY['realistic', 'semi-real'], false, 30),
  
  -- Other/Uncategorized
  ('GAME_cammy_white_aiwaifu-10.safetensors', 'GAME Cammy White AI Waifu', 'other', ARRAY['game', 'character'], false, 40),
  ('JANKUV5NSFWTrainedNoobai_v40.safetensors', 'JANKU V5 NSFW Noobai v4.0', 'other', ARRAY['nsfw', 'noobai'], false, 41),
  ('abyssorangemix2SFW_abyssorangemix2Sfw.safetensors', 'Abyss Orange Mix 2 SFW', 'other', ARRAY['mix', 'sfw'], false, 42),
  ('catTowerNoobaiXL_v14EpsilonPred.safetensors', 'Cat Tower Noobai XL v1.4', 'other', ARRAY['noobai', 'sdxl'], false, 43),
  ('counterfeitxl_v25.safetensors', 'Counterfeit XL v2.5', 'other', ARRAY['sdxl'], false, 44),
  ('dvine_v51.safetensors', 'Dvine v5.1', 'other', ARRAY['mix'], false, 45),
  ('flatJusticeNoobaiV_v12.safetensors', 'Flat Justice Noobai V v1.2', 'other', ARRAY['noobai'], false, 46),
  ('lemonsugarmix_v22.safetensors', 'Lemon Sugar Mix v2.2', 'other', ARRAY['mix'], false, 47),
  ('luminousEcho_v10.safetensors', 'Luminous Echo v1.0', 'other', ARRAY['mix'], false, 48),
  ('mocasemix_prefectponyV2.safetensors', 'Mocase Mix Perfect Pony v2', 'other', ARRAY['pony', 'mix'], false, 49),
  ('moonmilkContrastIL_8steps.safetensors', 'Moonmilk Contrast IL 8steps', 'other', ARRAY['illustrious', 'fast'], false, 50),
  ('moonmilkContrastIL_ilV2.safetensors', 'Moonmilk Contrast IL v2', 'other', ARRAY['illustrious', 'contrast'], false, 51),
  ('nepotism_xii.safetensors', 'Nepotism XII', 'other', ARRAY['mix'], false, 52),
  ('novaAnimeXL_xlV10.safetensors', 'Nova Anime XL v1.0', 'other', ARRAY['anime', 'sdxl'], false, 53),
  ('originByN0utis_originFluxAnimeV1.safetensors', 'Origin by N0utis Flux Anime v1', 'other', ARRAY['flux', 'anime'], false, 54),
  ('plantMilkModelSuite_walnut.safetensors', 'Plant Milk Model Suite Walnut', 'other', ARRAY['mix'], false, 55),
  ('unholyDesireMixFoolS_v50.safetensors', 'Unholy Desire Mix Fool S v5.0', 'other', ARRAY['mix', 'nsfw'], false, 56),
  ('veteDreamhexILL_v2.safetensors', 'Vete Dreamhex ILL v2', 'other', ARRAY['illustrious'], false, 57),
  ('whitefreesia_v12.safetensors', 'White Freesia v1.2', 'other', ARRAY['mix'], false, 58)
ON CONFLICT (filename) DO NOTHING;

-- 7. Add comments
COMMENT ON TABLE comfyui_models IS 'ComfyUI model metadata cache with categorization and usage tracking';
COMMENT ON COLUMN comfyui_models.filename IS 'Model filename on RunPod (unique identifier)';
COMMENT ON COLUMN comfyui_models.display_name IS 'Human-readable model name';
COMMENT ON COLUMN comfyui_models.category IS 'Model category: anime, pony, 3d, realistic, other';
COMMENT ON COLUMN comfyui_models.recommended_settings IS 'Recommended generation settings as JSON: {"steps": 25, "cfg": 7.0, "sampler": "euler"}';
COMMENT ON COLUMN comfyui_models.is_featured IS 'Show this model prominently in UI';
COMMENT ON COLUMN comfyui_models.last_synced_at IS 'Last sync timestamp from RunPod';
