-- Add metadata columns to ai_models table
ALTER TABLE public.ai_models
ADD COLUMN supports_text BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN supports_image_input BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN supports_image_output BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN supports_audio BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN supports_video BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN supports_streaming BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN supports_function_calling BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN supports_json BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN max_tokens INTEGER,
ADD COLUMN context_window INTEGER;

-- Indexes for filtering
CREATE INDEX ai_models_supports_image_input_idx ON public.ai_models(supports_image_input);
CREATE INDEX ai_models_supports_streaming_idx ON public.ai_models(supports_streaming);

-- Comments
COMMENT ON COLUMN public.ai_models.supports_text IS 'Supports text input/output';
COMMENT ON COLUMN public.ai_models.supports_image_input IS 'Supports image input (vision)';
COMMENT ON COLUMN public.ai_models.supports_image_output IS 'Supports image generation';
COMMENT ON COLUMN public.ai_models.supports_audio IS 'Supports audio input/output';
COMMENT ON COLUMN public.ai_models.supports_video IS 'Supports video input/output';
COMMENT ON COLUMN public.ai_models.supports_streaming IS 'Supports streaming responses';
COMMENT ON COLUMN public.ai_models.supports_function_calling IS 'Supports function/tool calling';
COMMENT ON COLUMN public.ai_models.supports_json IS 'Supports JSON mode output';
COMMENT ON COLUMN public.ai_models.max_tokens IS 'Maximum output tokens';
COMMENT ON COLUMN public.ai_models.context_window IS 'Context window size in tokens';
