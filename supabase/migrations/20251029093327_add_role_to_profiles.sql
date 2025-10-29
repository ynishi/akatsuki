-- Add role column to profiles table for role-based access control
-- Default role is 'user', with options for 'admin' and 'moderator'

-- Add role column with default value
ALTER TABLE profiles
ADD COLUMN role TEXT NOT NULL DEFAULT 'user';

-- Add CHECK constraint to ensure only valid roles
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('user', 'admin', 'moderator'));

-- Add index on role for faster role-based queries
CREATE INDEX profiles_role_idx ON profiles(role);

-- Add comment for documentation
COMMENT ON COLUMN profiles.role IS 'User role for access control: user (default), admin, moderator';

-- Update the handle_new_user function to set role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name, role)
  VALUES (
    NEW.id,
    -- Extract username from metadata if provided, otherwise use email prefix
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    ),
    -- Extract display_name from metadata if provided, otherwise use email prefix
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    ),
    -- Extract role from metadata if provided, otherwise default to 'user'
    COALESCE(
      NEW.raw_user_meta_data->>'role',
      'user'
    )
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If username already exists, append user id to make it unique
    INSERT INTO public.profiles (user_id, username, display_name, role)
    VALUES (
      NEW.id,
      split_part(NEW.email, '@', 1) || '_' || substring(NEW.id::text, 1, 8),
      split_part(NEW.email, '@', 1),
      COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    );
    RETURN NEW;
END;
$$;
