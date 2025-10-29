-- Add trigger to automatically create profile when a new user signs up
-- This ensures 1:1 relationship between auth.users and profiles

-- Function: Create profile record when new user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name)
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
    )
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If username already exists, append user id to make it unique
    INSERT INTO public.profiles (user_id, username, display_name)
    VALUES (
      NEW.id,
      split_part(NEW.email, '@', 1) || '_' || substring(NEW.id::text, 1, 8),
      split_part(NEW.email, '@', 1)
    );
    RETURN NEW;
END;
$$;

-- Trigger: Execute handle_new_user() after INSERT on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile record when a new user signs up. Extracts username and display_name from metadata if provided, otherwise uses email prefix.';
