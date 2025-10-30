-- ============================================================================
-- Delete Old 'uploads' Bucket Migration
-- ============================================================================
-- Remove the deprecated 'uploads' bucket and its policies
-- Current system uses 'public_assets' and 'private_uploads' instead
-- ============================================================================

-- Drop old RLS policies for 'uploads' bucket if they exist
DROP POLICY IF EXISTS "Users can upload to their own folder in uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own files in uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public can read all files in uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files in uploads" ON storage.objects;

-- First, delete all files in the 'uploads' bucket
-- This removes the foreign key constraint
DELETE FROM storage.objects WHERE bucket_id = 'uploads';

-- Then, delete the 'uploads' bucket itself
DELETE FROM storage.buckets WHERE id = 'uploads';

-- Note: All files in the 'uploads' bucket will be removed.
-- Make sure to migrate any important data before running this migration.
