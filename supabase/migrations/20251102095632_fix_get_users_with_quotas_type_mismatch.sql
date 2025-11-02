-- Fix: get_users_with_quotas type mismatch
-- Issue: auth.users.email is type 'email' not TEXT, causing type mismatch
-- Solution: Explicitly cast email to TEXT

CREATE OR REPLACE FUNCTION get_users_with_quotas(target_month TEXT DEFAULT NULL)
RETURNS TABLE (
  quota_id UUID,
  user_id UUID,
  email TEXT,
  plan_type TEXT,
  monthly_request_limit INTEGER,
  current_month TEXT,
  requests_used INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If target_month is not specified, use current month
  IF target_month IS NULL THEN
    target_month := TO_CHAR(NOW(), 'YYYY-MM');
  END IF;

  RETURN QUERY
  SELECT
    q.id AS quota_id,
    q.user_id,
    u.email::TEXT,
    q.plan_type,
    q.monthly_request_limit,
    q.current_month,
    q.requests_used,
    q.created_at,
    q.updated_at
  FROM user_quotas q
  INNER JOIN auth.users u ON u.id = q.user_id
  WHERE q.current_month = target_month
  ORDER BY q.requests_used DESC;
END;
$$;

COMMENT ON FUNCTION get_users_with_quotas(TEXT) IS 'Get all users with their quota information including email from auth.users (fixed type mismatch)';
