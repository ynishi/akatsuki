-- ============================================================================
-- Storage Hooks Migration
-- ============================================================================
-- Triggers to auto-delete Storage files when files table records are deleted
-- ============================================================================

-- ============================================================================
-- Delete trigger function
-- ============================================================================
-- When a record is deleted from files table, also delete from Storage

CREATE OR REPLACE FUNCTION delete_storage_object_on_file_delete()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Skip Storage deletion for 'uploading' status files
  -- (File may not exist in Storage yet if deleted during upload)
  IF OLD.status = 'uploading' THEN
    RAISE WARNING 'Skipping storage deletion for uploading file: %', OLD.storage_path;
    RETURN OLD;
  END IF;

  -- Attempt to delete file from Storage
  BEGIN
    PERFORM storage.foldername(OLD.bucket_name, OLD.storage_path);

    -- Delete from storage.objects
    DELETE FROM storage.objects
    WHERE bucket_id = OLD.bucket_name
      AND name = OLD.storage_path;

    RAISE LOG 'Successfully deleted storage object: % from bucket: %', OLD.storage_path, OLD.bucket_name;

  EXCEPTION WHEN OTHERS THEN
    -- On deletion failure, record in orphaned_files table
    INSERT INTO public.orphaned_files (storage_path, bucket_name, error_message)
    VALUES (OLD.storage_path, OLD.bucket_name, SQLERRM)
    ON CONFLICT (storage_path, bucket_name) DO UPDATE
    SET retry_count = public.orphaned_files.retry_count + 1,
        last_retry_at = now(),
        error_message = EXCLUDED.error_message;

    -- Log error (don't fail the trigger itself)
    RAISE WARNING 'Failed to delete storage object: %, Error: %', OLD.storage_path, SQLERRM;
  END;

  -- Allow DB record deletion to complete normally
  RETURN OLD;
END;
$$;

-- ============================================================================
-- Create trigger
-- ============================================================================
-- Fire trigger after DELETE on files table

CREATE TRIGGER trigger_delete_storage_object
  AFTER DELETE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION delete_storage_object_on_file_delete();

-- ============================================================================
-- Add comments
-- ============================================================================

COMMENT ON FUNCTION delete_storage_object_on_file_delete() IS
'Auto-deletes Storage files when files table records are deleted. Records failures in orphaned_files.';
