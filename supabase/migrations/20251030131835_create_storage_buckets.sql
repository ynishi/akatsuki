-- Create Storage Buckets for file uploads
-- This migration creates two buckets:
-- 1. public_assets (public) - For public file uploads (avatars, logos, etc.)
-- 2. private_uploads (private) - For private files requiring signed URLs

-- Create public assets bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public_assets',
  'public_assets',
  true,
  10485760, -- 10MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Create private uploads bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'private_uploads',
  'private_uploads',
  false,
  10485760, -- 10MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/json']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for public_assets bucket (public bucket)
-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload to their own folder in public_assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public_assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read their own files in public_assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'public_assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to all files in public_assets bucket
CREATE POLICY "Public can read all files in public_assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'public_assets');

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own files in public_assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'public_assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policies for private_uploads bucket
-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload to their own folder in private_uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'private_uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read only their own files
CREATE POLICY "Users can read only their own files in private_uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'private_uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own files in private_uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'private_uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
