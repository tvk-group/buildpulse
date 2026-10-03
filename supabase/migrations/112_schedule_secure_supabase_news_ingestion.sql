CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
INSERT INTO public.buildpulse_private_settings(key,value,updated_at)
VALUES('ingest_scheduler_secret',encode(gen_random_bytes(32),'hex'),now())
ON CONFLICT(key) DO NOTHING;

DO $$
DECLARE jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname='buildpulse-supabase-ingest-fallback';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
END $$;

SELECT cron.schedule(
  'buildpulse-supabase-ingest-fallback',
  '19 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://jdgddwutqypxxvfvkypw.supabase.co/functions/v1/buildpulse-ingest-scheduled',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-buildpulse-scheduler-secret',(SELECT value FROM public.buildpulse_private_settings WHERE key='ingest_scheduler_secret')
    ),
    body := '{}'::jsonb
  );
  $cron$
);
