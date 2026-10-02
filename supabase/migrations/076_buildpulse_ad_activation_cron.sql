CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE existing_job BIGINT;
BEGIN
  SELECT jobid INTO existing_job FROM cron.job WHERE jobname='buildpulse-ad-activation-db' LIMIT 1;
  IF existing_job IS NOT NULL THEN PERFORM cron.unschedule(existing_job); END IF;
END $$;

SELECT cron.schedule(
  'buildpulse-ad-activation-db',
  '*/5 * * * *',
  $$SELECT public.buildpulse_activate_ads();$$
);