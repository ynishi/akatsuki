-- RPC Function: increment_model_usage
-- モデル使用カウントをアトミックにインクリメント

CREATE OR REPLACE FUNCTION increment_model_usage(model_filename TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE comfyui_models
  SET 
    usage_count = usage_count + 1,
    last_used_at = now()
  WHERE filename = model_filename;
END;
$$;

COMMENT ON FUNCTION increment_model_usage(TEXT) IS 'Atomically increment model usage count and update last_used_at timestamp';
