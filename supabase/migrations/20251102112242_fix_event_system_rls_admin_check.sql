-- Fix Event System RLS: Wrap is_admin() in SELECT
-- Issue: RLS policies should use (SELECT is_admin()) instead of is_admin() directly

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admin can update events" ON system_events;
DROP POLICY IF EXISTS "Admin can delete events" ON system_events;
DROP POLICY IF EXISTS "Admin can view all events" ON system_events;
DROP POLICY IF EXISTS "Admin can manage event handlers" ON event_handlers;

-- Recreate with proper SELECT wrapper
CREATE POLICY "Admin can update events"
  ON system_events
  FOR UPDATE
  USING ((SELECT is_admin()) = true);

CREATE POLICY "Admin can delete events"
  ON system_events
  FOR DELETE
  USING ((SELECT is_admin()) = true);

CREATE POLICY "Admin can view all events"
  ON system_events
  FOR SELECT
  USING ((SELECT is_admin()) = true);

CREATE POLICY "Admin can manage event handlers"
  ON event_handlers
  FOR ALL
  USING ((SELECT is_admin()) = true);

COMMENT ON POLICY "Admin can view all events" ON system_events IS 'Admins have full visibility for monitoring';
