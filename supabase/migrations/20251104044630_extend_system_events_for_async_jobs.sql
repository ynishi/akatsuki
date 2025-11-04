-- ============================================================
-- Extend system_events for Async Job Processing
-- ============================================================
-- Adds progress tracking, result storage, and processing timestamps
-- for job execution functionality

-- Add progress tracking column
ALTER TABLE system_events
  ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

-- Add result storage column
ALTER TABLE system_events
  ADD COLUMN IF NOT EXISTS result JSONB;

-- Add processing start timestamp column
ALTER TABLE system_events
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_system_events_status
  ON system_events(status);

CREATE INDEX IF NOT EXISTS idx_system_events_user_id
  ON system_events(user_id);

CREATE INDEX IF NOT EXISTS idx_system_events_processing
  ON system_events(status, scheduled_at)
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_system_events_user_status
  ON system_events(user_id, status);

CREATE INDEX IF NOT EXISTS idx_system_events_job_type
  ON system_events(event_type) WHERE event_type LIKE 'job:%';

-- Add column comments
COMMENT ON COLUMN system_events.progress IS 'Job progress percentage (0-100)';
COMMENT ON COLUMN system_events.result IS 'Job execution result (JSON)';
COMMENT ON COLUMN system_events.processing_started_at IS 'Job processing start timestamp';
