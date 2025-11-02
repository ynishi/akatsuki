-- RLS Policies for Event System

-- ============================================================
-- system_events RLS
-- ============================================================
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own events
CREATE POLICY "Users can view own events"
  ON system_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert events (but user_id will be set automatically)
CREATE POLICY "Users can create events"
  ON system_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Only system/admin can update events
CREATE POLICY "Admin can update events"
  ON system_events
  FOR UPDATE
  USING (is_admin());

-- Only admin can delete events
CREATE POLICY "Admin can delete events"
  ON system_events
  FOR DELETE
  USING (is_admin());

-- Admin can view all events
CREATE POLICY "Admin can view all events"
  ON system_events
  FOR SELECT
  USING (is_admin());

-- ============================================================
-- event_handlers RLS
-- ============================================================
ALTER TABLE event_handlers ENABLE ROW LEVEL SECURITY;

-- Anyone can view active handlers (for documentation)
CREATE POLICY "Anyone can view event handlers"
  ON event_handlers
  FOR SELECT
  USING (TRUE);

-- Only admin can modify handlers
CREATE POLICY "Admin can manage event handlers"
  ON event_handlers
  FOR ALL
  USING (is_admin());

COMMENT ON POLICY "Users can view own events" ON system_events IS 'Users can only see events related to them';
COMMENT ON POLICY "Admin can view all events" ON system_events IS 'Admins have full visibility for monitoring';
