-- Create Storage Buckets for file uploads
-- This migration creates two buckets:
-- 1. uploads (public) - For public file uploads (images, documents, etc.)
-- 2. private_uploads (private) - For private files requiring signed URLs

-- Create public uploads bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  10485760, -- 10MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain']
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

-- RLS Policies for uploads bucket (public bucket)
-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload to their own folder in uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read their own files in uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to all files in uploads bucket
CREATE POLICY "Public can read all files in uploads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'uploads');

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own files in uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'uploads' AND
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
