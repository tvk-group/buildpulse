-- Hourly, conditional, idempotent remediation for base-currency missing journals only.
select cron.unschedule(jobid) from cron.job where jobname='buildpulse-finance-safe-remediation-db';
select cron.schedule('buildpulse-finance-safe-remediation-db','17 * * * *',$$
select public.buildpulse_remediate_safe_reconciliation(25)
where exists (
 select 1 from public.buildpulse_finance_reconciliation_queue
 where reconciliation_state='missing_journal'
);
$$);
