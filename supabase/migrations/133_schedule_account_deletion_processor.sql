select cron.schedule('buildpulse-account-deletion-db','43 * * * *',$$select private.buildpulse_process_due_account_deletions(10);$$);
