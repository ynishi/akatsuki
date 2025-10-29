-- AI Models Table
CREATE TABLE public.ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_basic BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, model_id)
);

-- Indexes
CREATE INDEX ai_models_provider_idx ON public.ai_models(provider);
CREATE INDEX ai_models_is_active_idx ON public.ai_models(is_active);
CREATE INDEX ai_models_sort_order_idx ON public.ai_models(sort_order);

-- RLS
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

-- All users can read
CREATE POLICY "ai_models_read_all"
  ON public.ai_models
  FOR SELECT
  USING (true);

-- Admin only write
CREATE POLICY "ai_models_write_admin"
  ON public.ai_models
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Auto update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_models_updated_at
  BEFORE UPDATE ON public.ai_models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON TABLE public.ai_models IS 'AI provider models master data';
COMMENT ON COLUMN public.ai_models.provider IS 'Provider name (openai, claude, gemini)';
COMMENT ON COLUMN public.ai_models.model_id IS 'Model identifier used in API calls';
COMMENT ON COLUMN public.ai_models.label IS 'Display label for UI';
COMMENT ON COLUMN public.ai_models.is_active IS 'Whether this model is currently available';
COMMENT ON COLUMN public.ai_models.is_basic IS 'Basic tier model (false = Advanced tier)';
COMMENT ON COLUMN public.ai_models.sort_order IS 'Display order in UI';
