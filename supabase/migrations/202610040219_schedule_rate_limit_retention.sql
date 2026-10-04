select cron.schedule('buildpulse-rate-limit-retention','17 3 * * *',$$delete from public.buildpulse_rate_limits where window_start < now()-interval '8 days'$$);
