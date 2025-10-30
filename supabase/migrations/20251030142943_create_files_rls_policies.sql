-- ============================================================================
-- Files RLS Policies Migration
-- ============================================================================
-- RLS policies for files and orphaned_files tables
-- ============================================================================

-- ============================================================================
-- files table RLS policies
-- ============================================================================

-- Enable RLS
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Users can view only their own files
CREATE POLICY "Users can view their own files"
  ON public.files
  FOR SELECT
  USING (auth.uid() = owner_id);

-- INSERT policy: Authenticated users can insert only their own files
CREATE POLICY "Users can insert their own files"
  ON public.files
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- UPDATE policy: Owners can update only their own files
CREATE POLICY "Users can update their own files"
  ON public.files
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- DELETE policy: Owners can delete only their own files
CREATE POLICY "Users can delete their own files"
  ON public.files
  FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================================
-- Public file viewing policy (optional)
-- ============================================================================
-- Enable this to allow anyone to view public files

-- CREATE POLICY "Anyone can view public files"
--   ON public.files
--   FOR SELECT
--   USING (is_public = true);

-- ============================================================================
-- orphaned_files table RLS policies
-- ============================================================================
-- Only admins can access (regular users cannot access)

ALTER TABLE public.orphaned_files ENABLE ROW LEVEL SECURITY;

-- Admin SELECT policy (admin role only)
-- Assumes profiles table has a role column
CREATE POLICY "Only admins can view orphaned files"
  ON public.orphaned_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Admin DELETE policy (for cleanup)
CREATE POLICY "Only admins can delete orphaned files"
  ON public.orphaned_files
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- Service Role policies
-- ============================================================================
-- Edge Functions (SERVICE_ROLE_KEY) bypass RLS,
-- so no explicit policies are needed.

-- ============================================================================
-- Add comments
-- ============================================================================

COMMENT ON POLICY "Users can view their own files" ON public.files IS
'Owners can view only their own files';

COMMENT ON POLICY "Users can insert their own files" ON public.files IS
'Authenticated users can insert only their own files';

COMMENT ON POLICY "Users can update their own files" ON public.files IS
'Owners can update only their own files';

COMMENT ON POLICY "Users can delete their own files" ON public.files IS
'Owners can delete only their own files (Storage Hooks auto-delete from Storage)';

COMMENT ON POLICY "Only admins can view orphaned files" ON public.orphaned_files IS
'Only admins can view orphaned files';

COMMENT ON POLICY "Only admins can delete orphaned files" ON public.orphaned_files IS
'Only admins can delete orphaned files';
