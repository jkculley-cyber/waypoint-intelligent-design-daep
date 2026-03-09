-- Migration 053: pg_cron job for daily review-due reminders
-- Apply via Supabase SQL Editor:
-- https://supabase.com/dashboard/project/kvxecksvkimcgwhxxyhw/sql/new
--
-- BEFORE running: replace SERVICE_ROLE_KEY_HERE with the actual service role key
-- from Project Settings → API → service_role (secret) key.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing jobs with this name if re-running (handles duplicates safely)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'check-review-reminders';

-- Schedule daily at 6:00 AM CST (12:00 UTC)
SELECT cron.schedule(
  'check-review-reminders',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kvxecksvkimcgwhxxyhw.supabase.co/functions/v1/check-review-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SERVICE_ROLE_KEY_HERE'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
