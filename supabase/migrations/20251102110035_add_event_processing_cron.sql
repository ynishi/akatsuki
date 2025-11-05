-- Cron Job: Process System Events
-- Runs every minute to process pending events

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- NOTE: This migration requires app.settings to be configured first
-- Run this after setup: See docs/setup.md for configuration instructions
--
-- The settings should be set via:
--   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
--   ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
--
-- The setup script (scripts/setup.js) should handle this automatically.

-- Unschedule existing job if exists (idempotent)
SELECT cron.unschedule('process-system-events') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-system-events'
);

-- Schedule event processing every minute
SELECT cron.schedule(
  'process-system-events',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/process-events',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL';
COMMENT ON EXTENSION pg_net IS 'HTTP client for PostgreSQL';
