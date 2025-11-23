-- Add WASM support to public_assets bucket
-- Update allowed_mime_types to include application/wasm
-- Increase file_size_limit to 50MB for WASM modules

UPDATE storage.buckets
SET
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'application/wasm'  -- Add WASM support
  ],
  file_size_limit = 52428800  -- 50MB in bytes (50 * 1024 * 1024)
WHERE id = 'public_assets';
