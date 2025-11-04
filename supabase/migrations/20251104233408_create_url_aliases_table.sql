-- Create url_aliases table for custom CDN URLs
-- Phase 2/3: SEO slugs + short URLs + OGP metadata

CREATE TABLE IF NOT EXISTS url_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES files(id) ON DELETE CASCADE,

  short_code text UNIQUE,
  slug text UNIQUE,

  og_title text,
  og_description text,
  og_image_alt text,

  access_count integer DEFAULT 0 NOT NULL,
  last_accessed_at timestamptz,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz,
  is_active boolean DEFAULT true NOT NULL,

  CONSTRAINT valid_identifier CHECK (
    short_code IS NOT NULL OR slug IS NOT NULL
  ),

  CONSTRAINT valid_short_code CHECK (
    short_code IS NULL OR
    (short_code ~ '^[a-zA-Z0-9_-]{3,20}$')
  ),

  CONSTRAINT valid_slug CHECK (
    slug IS NULL OR
    (slug ~ '^[a-z0-9-]{3,100}$')
  )
);

CREATE INDEX idx_url_aliases_short_code
  ON url_aliases(short_code)
  WHERE short_code IS NOT NULL;

CREATE INDEX idx_url_aliases_slug
  ON url_aliases(slug)
  WHERE slug IS NOT NULL;

CREATE INDEX idx_url_aliases_file_id
  ON url_aliases(file_id);

CREATE INDEX idx_url_aliases_active
  ON url_aliases(is_active)
  WHERE is_active = true;

CREATE INDEX idx_url_aliases_expires_at
  ON url_aliases(expires_at)
  WHERE expires_at IS NOT NULL;

ALTER TABLE url_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "url_aliases are viewable by everyone"
  ON url_aliases
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "url_aliases can be created by file owner"
  ON url_aliases
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM files
      WHERE files.id = file_id
      AND files.owner_id = auth.uid()
    )
  );

CREATE POLICY "url_aliases can be updated by file owner"
  ON url_aliases
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM files
      WHERE files.id = file_id
      AND files.owner_id = auth.uid()
    )
  );

CREATE POLICY "url_aliases can be deleted by file owner"
  ON url_aliases
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM files
      WHERE files.id = file_id
      AND files.owner_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION update_url_aliases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_url_aliases_updated_at_trigger
  BEFORE UPDATE ON url_aliases
  FOR EACH ROW
  EXECUTE FUNCTION update_url_aliases_updated_at();

CREATE OR REPLACE FUNCTION deactivate_expired_url_aliases()
RETURNS void AS $$
BEGIN
  UPDATE url_aliases
  SET is_active = false
  WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE url_aliases IS 'Custom CDN URL aliases (short URLs, SEO slugs, OGP metadata)';
COMMENT ON COLUMN url_aliases.short_code IS 'Short code for SNS sharing (e.g. cat123)';
COMMENT ON COLUMN url_aliases.slug IS 'SEO-friendly URL slug (e.g. my-awesome-sunset-2025)';
COMMENT ON COLUMN url_aliases.og_title IS 'OGP title for social media sharing';
COMMENT ON COLUMN url_aliases.og_description IS 'OGP description for social media sharing';
COMMENT ON COLUMN url_aliases.og_image_alt IS 'OGP image alt text';
COMMENT ON COLUMN url_aliases.access_count IS 'Access counter for statistics';
COMMENT ON COLUMN url_aliases.expires_at IS 'Expiration date for temporary shared links';
COMMENT ON COLUMN url_aliases.is_active IS 'Active status (inactive aliases cannot be used)';
