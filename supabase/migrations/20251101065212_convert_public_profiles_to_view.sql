-- Create public_profiles as a view
-- This eliminates data duplication between profiles and public_profiles
--
-- Design:
-- - profiles table: Single source of truth for all user data
-- - public_profiles view: Read-only view exposing only public columns
-- - RLS: profiles (own data only), public_profiles view (everyone can read)

-- Drop existing public_profiles if it exists (table or view)
DROP VIEW IF EXISTS public_profiles CASCADE;
DROP TABLE IF EXISTS public_profiles CASCADE;

-- Create public_profiles as a VIEW
-- This view selects only public columns from profiles table
CREATE VIEW public_profiles AS
SELECT
  id,
  user_id,
  username,
  display_name,
  avatar_url,
  bio,
  created_at,
  updated_at
FROM profiles;

-- Grant SELECT permission to authenticated and anonymous users
GRANT SELECT ON public_profiles TO authenticated, anon;

-- Add comment for documentation
COMMENT ON VIEW public_profiles IS 'Read-only view of public user profile information. Backed by profiles table. Use profiles table directly for INSERT/UPDATE/DELETE operations.';
