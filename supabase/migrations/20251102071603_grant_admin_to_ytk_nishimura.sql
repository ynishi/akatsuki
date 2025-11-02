-- Grant Admin role to ytk.nishimura@gmail.com
UPDATE auth.users
SET raw_user_meta_data =
  COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'ytk.nishimura@gmail.com';
