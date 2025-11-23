-- Add WASM support to private_uploads bucket
-- Update allowed_mime_types to include application/wasm
-- Increase file_size_limit to 50MB for WASM modules

UPDATE storage.buckets
SET
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/json',
    'application/wasm'  -- Add WASM support
  ],
  file_size_limit = 52428800  -- 50MB in bytes (50 * 1024 * 1024)
WHERE id = 'private_uploads';
