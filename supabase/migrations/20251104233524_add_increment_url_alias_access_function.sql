-- Add increment_url_alias_access RPC function for statistics tracking

CREATE OR REPLACE FUNCTION increment_url_alias_access(
  p_identifier text,
  p_column text
)
RETURNS void AS $$
BEGIN
  IF p_column = 'short_code' THEN
    UPDATE url_aliases
    SET
      access_count = access_count + 1,
      last_accessed_at = now()
    WHERE short_code = p_identifier
      AND is_active = true;
  ELSIF p_column = 'slug' THEN
    UPDATE url_aliases
    SET
      access_count = access_count + 1,
      last_accessed_at = now()
    WHERE slug = p_identifier
      AND is_active = true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_url_alias_access IS 'Increment access count for URL aliases (called from cdn-gateway)';
