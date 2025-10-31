-- ============================================================================
-- Update Storage Buckets Migration
-- ============================================================================
-- Rename 'uploads' bucket to 'public_assets' and update policies
-- ============================================================================

-- Drop old policies for 'uploads' bucket if they exist
DROP POLICY IF EXISTS "Users can upload to their own folder in uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own files in uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public can read all files in uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files in uploads" ON storage.objects;

-- Create public_assets bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public_assets',
  'public_assets',
  true,
  10485760, -- 10MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies for public_assets bucket if they exist
DROP POLICY IF EXISTS "Users can upload to their own folder in public_assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own files in public_assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can read all files in public_assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files in public_assets" ON storage.objects;

-- Create RLS Policies for public_assets bucket
CREATE POLICY "Users can upload to their own folder in public_assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public_assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own files in public_assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'public_assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Public can read all files in public_assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'public_assets');

CREATE POLICY "Users can delete their own files in public_assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'public_assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Ensure private_uploads bucket exists with correct settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'private_uploads',
  'private_uploads',
  false,
  10485760, -- 10MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/json']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Ensure RLS Policies for private_uploads bucket exist
DROP POLICY IF EXISTS "Users can upload to their own folder in private_uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can read only their own files in private_uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files in private_uploads" ON storage.objects;

CREATE POLICY "Users can upload to their own folder in private_uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'private_uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read only their own files in private_uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'private_uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own files in private_uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'private_uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
