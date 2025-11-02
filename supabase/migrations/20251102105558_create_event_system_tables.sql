-- Event System: Lightweight event-driven job queue
-- Pattern: Direct Emit -> DB with Realtime notifications

-- ============================================================
-- Table: system_events
-- ============================================================
-- Stores all system events for async processing and audit log
CREATE TABLE system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  priority INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_system_events_status ON system_events(status);
CREATE INDEX idx_system_events_event_type ON system_events(event_type);
CREATE INDEX idx_system_events_scheduled_at ON system_events(scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_system_events_user_id ON system_events(user_id);
CREATE INDEX idx_system_events_created_at ON system_events(created_at DESC);

-- Updated_at trigger
CREATE TRIGGER set_system_events_updated_at
  BEFORE UPDATE ON system_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE system_events IS 'Event queue for async job processing and system audit log';
COMMENT ON COLUMN system_events.event_type IS 'Event type (e.g., image.generated, quota.exceeded)';
COMMENT ON COLUMN system_events.payload IS 'Event data as JSON';
COMMENT ON COLUMN system_events.status IS 'Processing status: pending/processing/completed/failed/cancelled';
COMMENT ON COLUMN system_events.priority IS 'Higher number = higher priority';
COMMENT ON COLUMN system_events.scheduled_at IS 'When to process this event (supports delayed execution)';

-- ============================================================
-- Table: event_handlers
-- ============================================================
-- Configuration for event handlers (which Edge Function to call)
CREATE TABLE event_handlers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL UNIQUE,
  handler_function TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  timeout_seconds INTEGER NOT NULL DEFAULT 300,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_handlers_event_type ON event_handlers(event_type);
CREATE INDEX idx_event_handlers_is_active ON event_handlers(is_active);

CREATE TRIGGER set_event_handlers_updated_at
  BEFORE UPDATE ON event_handlers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE event_handlers IS 'Event handler configuration (maps event types to Edge Functions)';
COMMENT ON COLUMN event_handlers.handler_function IS 'Edge Function name to invoke';

-- ============================================================
-- Initial Event Handlers
-- ============================================================
INSERT INTO event_handlers (event_type, handler_function, description) VALUES
  ('image.generated', 'handle-image-generated', 'Process generated images (thumbnails, metadata)'),
  ('quota.exceeded', 'handle-quota-exceeded', 'Send quota exceeded notifications'),
  ('quota.warning', 'handle-quota-warning', 'Send quota warning notifications'),
  ('user.registered', 'handle-user-registered', 'Initialize new user quota and send welcome email'),
  ('model.synced', 'handle-model-synced', 'Update model cache statistics');

-- ============================================================
-- RPC: Get pending events for processing
-- ============================================================
CREATE OR REPLACE FUNCTION get_pending_events(batch_size INTEGER DEFAULT 10)
RETURNS SETOF system_events
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE system_events
  SET status = 'processing', updated_at = NOW()
  WHERE id IN (
    SELECT id
    FROM system_events
    WHERE status = 'pending'
      AND scheduled_at <= NOW()
    ORDER BY priority DESC, scheduled_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

COMMENT ON FUNCTION get_pending_events(INTEGER) IS 'Atomically fetch and mark events as processing (prevents duplicate processing)';

-- ============================================================
-- RPC: Mark event as completed
-- ============================================================
CREATE OR REPLACE FUNCTION complete_event(event_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE system_events
  SET status = 'completed',
      processed_at = NOW(),
      updated_at = NOW()
  WHERE id = event_id;
END;
$$;

-- ============================================================
-- RPC: Mark event as failed (with retry logic)
-- ============================================================
CREATE OR REPLACE FUNCTION fail_event(event_id UUID, error_msg TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_retry INTEGER;
  max_retry INTEGER;
BEGIN
  SELECT retry_count, max_retries INTO current_retry, max_retry
  FROM system_events
  WHERE id = event_id;

  IF current_retry < max_retry THEN
    -- Retry: reset to pending with incremented retry count
    UPDATE system_events
    SET status = 'pending',
        retry_count = retry_count + 1,
        error_message = error_msg,
        scheduled_at = NOW() + INTERVAL '5 minutes' * (retry_count + 1),
        updated_at = NOW()
    WHERE id = event_id;
  ELSE
    -- Max retries reached: mark as failed
    UPDATE system_events
    SET status = 'failed',
        error_message = error_msg,
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = event_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION fail_event(UUID, TEXT) IS 'Mark event as failed with exponential backoff retry logic';

-- ============================================================
-- Enable Realtime for Frontend notifications
-- ============================================================
-- Note: This needs to be manually enabled in Supabase Dashboard:
-- Database -> Tables -> system_events -> Enable Realtime
-- Or add to publication: supabase_realtime_messages_publication
