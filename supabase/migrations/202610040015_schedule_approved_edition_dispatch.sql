-- Conditional approved-edition dispatch. The cron is active, but no HTTP request is made until the dedicated BuildPulse mail domain is verified.
select cron.schedule('buildpulse-approved-edition-dispatch-db','*/5 * * * *',$$
select net.http_post(
 url := 'https://jdgddwutqypxxvfvkypw.supabase.co/functions/v1/buildpulse-approved-editions',
 headers := jsonb_build_object(
  'Content-Type','application/json',
  'x-buildpulse-scheduler-secret',(select value from public.buildpulse_private_settings where key='edition_scheduler_secret')
 ),
 body := '{}'::jsonb
)
where exists (
 select 1 from public.buildpulse_private_settings
 where key='resend_domain_status' and value='verified'
);
$$);
