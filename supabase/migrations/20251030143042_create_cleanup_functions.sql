-- ============================================================================
-- Cleanup & Consistency Check Functions Migration
-- ============================================================================
-- Orphaned file cleanup and DB-Storage consistency check functions
-- ============================================================================

-- ============================================================================
-- 1. Orphaned file cleanup function
-- ============================================================================
-- Deletes files from Storage that are recorded in orphaned_files table

CREATE OR REPLACE FUNCTION cleanup_orphaned_files()
RETURNS TABLE(cleaned_count int, failed_count int)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  orphan_record RECORD;
  cleaned int := 0;
  failed int := 0;
BEGIN
  -- Process only files with retry_count < 3
  FOR orphan_record IN
    SELECT * FROM public.orphaned_files
    WHERE retry_count < 3
    ORDER BY created_at
  LOOP
    BEGIN
      -- Retry Storage deletion
      DELETE FROM storage.objects
      WHERE bucket_id = orphan_record.bucket_name
        AND name = orphan_record.storage_path;

      -- On success, delete from orphaned_files
      DELETE FROM public.orphaned_files
      WHERE id = orphan_record.id;

      cleaned := cleaned + 1;
      RAISE LOG 'Cleaned orphaned file: %', orphan_record.storage_path;

    EXCEPTION WHEN OTHERS THEN
      -- On failure, update retry count
      UPDATE public.orphaned_files
      SET retry_count = retry_count + 1,
          last_retry_at = now(),
          error_message = SQLERRM
      WHERE id = orphan_record.id;

      failed := failed + 1;
      RAISE WARNING 'Failed to clean orphaned file: %, Error: %', orphan_record.storage_path, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT cleaned, failed;
END;
$$;

-- ============================================================================
-- 2. DB and Storage consistency check function
-- ============================================================================
-- Detects files that exist in DB but not in Storage, or vice versa

CREATE OR REPLACE FUNCTION check_storage_consistency()
RETURNS TABLE(
  issue_type text,
  file_id uuid,
  storage_path text,
  bucket_name text,
  details text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Files in DB but not in Storage (broken references)
  RETURN QUERY
  SELECT
    'missing_in_storage'::text AS issue_type,
    f.id AS file_id,
    f.storage_path,
    f.bucket_name,
    'File exists in DB but not in Storage'::text AS details
  FROM public.files f
  WHERE NOT EXISTS (
    SELECT 1 FROM storage.objects o
    WHERE o.bucket_id = f.bucket_name
      AND o.name = f.storage_path
  )
  AND f.status = 'active'; -- Check only active files

  -- 2. Files in Storage but not in DB (true orphaned files)
  -- Consider 'uploading' status and only check files older than 1 hour
  RETURN QUERY
  SELECT
    'orphaned_in_storage'::text AS issue_type,
    NULL::uuid AS file_id,
    o.name AS storage_path,
    o.bucket_id AS bucket_name,
    'File exists in Storage but not in DB'::text AS details
  FROM storage.objects o
  WHERE (o.bucket_id = 'public_assets' OR o.bucket_id = 'private_uploads')
    AND NOT EXISTS (
      SELECT 1 FROM public.files f
      WHERE f.storage_path = o.name
        AND f.bucket_name = o.bucket_id
    )
    AND o.created_at < now() - interval '1 hour';
END;
$$;

-- ============================================================================
-- 3. Stuck uploads detection function
-- ============================================================================
-- Finds files that remain in 'uploading' status

CREATE OR REPLACE FUNCTION find_stuck_uploads(older_than_minutes int DEFAULT 60)
RETURNS TABLE(
  file_id uuid,
  owner_id uuid,
  storage_path text,
  created_at timestamptz,
  minutes_stuck int
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id AS file_id,
    f.owner_id,
    f.storage_path,
    f.created_at,
    EXTRACT(EPOCH FROM (now() - f.created_at))::int / 60 AS minutes_stuck
  FROM public.files f
  WHERE f.status = 'uploading'
    AND f.created_at < now() - (older_than_minutes || ' minutes')::interval
  ORDER BY f.created_at;
END;
$$;

-- ============================================================================
-- 4. User storage usage calculation function
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_user_storage_usage(user_id uuid)
RETURNS TABLE(
  total_files bigint,
  total_bytes bigint,
  total_mb numeric,
  public_files bigint,
  private_files bigint
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_files,
    COALESCE(SUM(file_size), 0)::bigint AS total_bytes,
    ROUND(COALESCE(SUM(file_size), 0)::numeric / 1024 / 1024, 2) AS total_mb,
    COUNT(*) FILTER (WHERE is_public = true)::bigint AS public_files,
    COUNT(*) FILTER (WHERE is_public = false)::bigint AS private_files
  FROM public.files
  WHERE owner_id = user_id
    AND status = 'active';
END;
$$;

-- ============================================================================
-- 5. Overall storage statistics function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_storage_statistics()
RETURNS TABLE(
  total_files bigint,
  total_bytes bigint,
  total_mb numeric,
  public_files bigint,
  private_files bigint,
  orphaned_files bigint,
  stuck_uploads bigint
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::bigint FROM public.files WHERE status = 'active') AS total_files,
    (SELECT COALESCE(SUM(file_size), 0)::bigint FROM public.files WHERE status = 'active') AS total_bytes,
    (SELECT ROUND(COALESCE(SUM(file_size), 0)::numeric / 1024 / 1024, 2) FROM public.files WHERE status = 'active') AS total_mb,
    (SELECT COUNT(*)::bigint FROM public.files WHERE is_public = true AND status = 'active') AS public_files,
    (SELECT COUNT(*)::bigint FROM public.files WHERE is_public = false AND status = 'active') AS private_files,
    (SELECT COUNT(*)::bigint FROM public.orphaned_files) AS orphaned_files,
    (SELECT COUNT(*)::bigint FROM public.files WHERE status = 'uploading' AND created_at < now() - interval '1 hour') AS stuck_uploads;
END;
$$;

-- ============================================================================
-- Add comments
-- ============================================================================

COMMENT ON FUNCTION cleanup_orphaned_files() IS
'Deletes orphaned files from Storage. Retries up to 3 times.';

COMMENT ON FUNCTION check_storage_consistency() IS
'Checks DB-Storage consistency. Detects missing_in_storage and orphaned_in_storage.';

COMMENT ON FUNCTION find_stuck_uploads(int) IS
'Finds files that remain in uploading status for longer than specified time.';

COMMENT ON FUNCTION calculate_user_storage_usage(uuid) IS
'Calculates storage usage per user.';

COMMENT ON FUNCTION get_storage_statistics() IS
'Retrieves overall storage usage statistics.';
