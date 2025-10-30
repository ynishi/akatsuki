-- ============================================================================
-- Files Tables Migration
-- ============================================================================
-- files table: File metadata management
-- orphaned_files table: Orphaned file tracking
-- ============================================================================

-- Create files table
CREATE TABLE IF NOT EXISTS public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Storage information
  storage_path text NOT NULL UNIQUE,
  bucket_name text NOT NULL DEFAULT 'public_assets',

  -- File information
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,

  -- Public/Private
  is_public boolean NOT NULL DEFAULT true,

  -- Status management
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('uploading', 'active', 'deleting')),

  -- Custom metadata (JSON)
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_files_owner_id ON public.files(owner_id);
CREATE INDEX idx_files_storage_path ON public.files(storage_path);
CREATE INDEX idx_files_bucket_name ON public.files(bucket_name);
CREATE INDEX idx_files_is_public ON public.files(is_public);
CREATE INDEX idx_files_status ON public.files(status);
CREATE INDEX idx_files_created_at ON public.files(created_at DESC);

-- Composite index (owner + public status)
CREATE INDEX idx_files_owner_is_public ON public.files(owner_id, is_public);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION update_files_updated_at();

-- ============================================================================
-- Create orphaned_files table
-- ============================================================================
-- Records orphaned files when rollback or deletion triggers fail

CREATE TABLE IF NOT EXISTS public.orphaned_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Storage information
  storage_path text NOT NULL,
  bucket_name text NOT NULL,

  -- Error information
  error_message text,

  -- Retry information
  retry_count int NOT NULL DEFAULT 0,
  last_retry_at timestamptz,

  -- Timestamp
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_orphaned_files_storage_path ON public.orphaned_files(storage_path);
CREATE INDEX idx_orphaned_files_bucket_name ON public.orphaned_files(bucket_name);
CREATE INDEX idx_orphaned_files_retry_count ON public.orphaned_files(retry_count);
CREATE INDEX idx_orphaned_files_created_at ON public.orphaned_files(created_at DESC);

-- Unique constraint (prevent duplicate file path records)
CREATE UNIQUE INDEX idx_orphaned_files_unique_path ON public.orphaned_files(storage_path, bucket_name);

-- ============================================================================
-- Add comments
-- ============================================================================

COMMENT ON TABLE public.files IS 'File metadata management table - Syncs Storage and DB';
COMMENT ON COLUMN public.files.owner_id IS 'File owner user ID';
COMMENT ON COLUMN public.files.storage_path IS 'File path in Storage (unique)';
COMMENT ON COLUMN public.files.bucket_name IS 'Bucket name (public_assets or private_uploads)';
COMMENT ON COLUMN public.files.is_public IS 'true: Public bucket, false: Private bucket';
COMMENT ON COLUMN public.files.status IS 'uploading: Uploading, active: Active, deleting: Deleting';
COMMENT ON COLUMN public.files.metadata IS 'Custom metadata (JSON format)';

COMMENT ON TABLE public.orphaned_files IS 'Orphaned file tracking table - Cleanup target';
COMMENT ON COLUMN public.orphaned_files.storage_path IS 'Storage path of orphaned file';
COMMENT ON COLUMN public.orphaned_files.retry_count IS 'Cleanup retry count';
