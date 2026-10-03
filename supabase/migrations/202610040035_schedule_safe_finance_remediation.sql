-- Hourly, conditional, idempotent remediation for base-currency missing journals only.
select cron.schedule('buildpulse-finance-safe-remediation-db','17 * * * *',$$
select public.buildpulse_remediate_safe_reconciliation(25)
where exists (
 select 1 from public.buildpulse_finance_reconciliation_queue
 where reconciliation_state='missing_journal'
);
$$);
