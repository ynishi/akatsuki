-- Fix ComfyUI Workflows RLS Policies
-- Change from raw_user_meta_data (insecure) to raw_app_meta_data (secure)
-- Reference: https://github.com/orgs/supabase/discussions/13091

-- 1. Drop existing admin-only policies
DROP POLICY IF EXISTS "Only admins can insert workflows" ON comfyui_workflows;
DROP POLICY IF EXISTS "Only admins can update workflows" ON comfyui_workflows;
DROP POLICY IF EXISTS "Only admins can delete workflows" ON comfyui_workflows;

-- 2. Create helper function to check admin role using app_metadata
-- This function checks auth.jwt() for app_metadata.role = 'admin'
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (auth.jwt() -> 'app_metadata' -> 'role')::text = '"admin"',
      false
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create new secure RLS policies using app_metadata

-- Only admins can insert workflows
CREATE POLICY "Only admins can insert workflows"
  ON comfyui_workflows
  FOR INSERT
  WITH CHECK (
    (SELECT is_admin()) = true
  );

-- Only admins can update workflows
CREATE POLICY "Only admins can update workflows"
  ON comfyui_workflows
  FOR UPDATE
  USING (
    (SELECT is_admin()) = true
  );

-- Only admins can delete workflows
CREATE POLICY "Only admins can delete workflows"
  ON comfyui_workflows
  FOR DELETE
  USING (
    (SELECT is_admin()) = true
  );

-- 4. Update existing admin user to use app_metadata instead of user_metadata
-- NOTE: This updates the app_metadata which is NOT user-modifiable
UPDATE auth.users
SET raw_app_meta_data = 
  COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'ytk.nishimura@gmail.com';

-- 5. Remove the insecure role from user_metadata (optional cleanup)
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'role'
WHERE email = 'ytk.nishimura@gmail.com'
  AND raw_user_meta_data ? 'role';

-- 6. Add helpful comment
COMMENT ON FUNCTION is_admin() IS 'Checks if current user has admin role in app_metadata. Returns false if not authenticated.';
