-- ============================================================================
-- Add owner_type to wasm_modules
-- ============================================================================
-- Purpose: Enable categorization of WASM modules into system/admin/user types
-- ============================================================================

-- Add owner_type column with default 'user'
ALTER TABLE public.wasm_modules
  ADD COLUMN owner_type text NOT NULL DEFAULT 'user'
    CHECK (owner_type IN ('system', 'admin', 'user'));

-- Create indexes for efficient filtering
CREATE INDEX idx_wasm_modules_owner_type
  ON public.wasm_modules(owner_type);

CREATE INDEX idx_wasm_modules_owner_type_status
  ON public.wasm_modules(owner_type, status);

-- Add comment
COMMENT ON COLUMN public.wasm_modules.owner_type IS
  'Module ownership type: system (built-in, all users), admin (admin-only), user (user-uploaded)';

-- ============================================================================
-- Update RLS Policies for owner_type
-- ============================================================================

-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Users can manage their own modules" ON public.wasm_modules;
DROP POLICY IF EXISTS "Public modules are readable by anyone" ON public.wasm_modules;
DROP POLICY IF EXISTS "Admins can manage all modules" ON public.wasm_modules;

-- Recreate policies with owner_type support

-- Policy 1: Users can manage their own user-type modules
CREATE POLICY "Users can manage their own modules"
  ON public.wasm_modules
  FOR ALL
  USING (
    owner_type = 'user' AND owner_id = auth.uid()
  );

-- Policy 2: Only admins can create/update/delete system/admin modules
CREATE POLICY "Only admins can manage system and admin modules"
  ON public.wasm_modules
  FOR ALL
  USING (
    owner_type IN ('system', 'admin') AND (SELECT is_admin()) = true
  );

-- Policy 3: System modules are readable by everyone (active only)
CREATE POLICY "System modules are readable by everyone"
  ON public.wasm_modules
  FOR SELECT
  USING (owner_type = 'system' AND status = 'active');

-- Policy 4: Admin modules are readable by admins only
CREATE POLICY "Admin modules are readable by admins only"
  ON public.wasm_modules
  FOR SELECT
  USING (owner_type = 'admin' AND (SELECT is_admin()) = true);

-- Policy 5: Public user modules are readable by anyone
CREATE POLICY "Public user modules are readable by anyone"
  ON public.wasm_modules
  FOR SELECT
  USING (
    owner_type = 'user'
    AND is_public = true
    AND status = 'active'
  );

-- Policy 6: Allowed users can read shared user modules (keep existing policy)
-- This policy remains unchanged as it only applies to user modules

-- ============================================================================
-- Data Migration (optional)
-- ============================================================================
-- All existing modules are already defaulted to 'user' type
-- If you want to mark specific modules as 'system', update them manually:
-- UPDATE public.wasm_modules SET owner_type = 'system' WHERE module_name IN ('image-resize', 'crypto-hash');
