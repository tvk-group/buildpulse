-- Least-privilege grants for customer-visible BuildPulse billing records.
-- Writes remain service-role only; authenticated customers may only read rows allowed by RLS.
revoke all on table public.buildpulse_accounting_documents from anon, authenticated;
revoke all on table public.buildpulse_billing_invoices from anon, authenticated;
revoke all on table public.buildpulse_billing_credit_notes from anon, authenticated;
revoke all on table public.buildpulse_crypto_accounting_evidence from anon, authenticated;

grant select on table public.buildpulse_accounting_documents to authenticated;
grant select on table public.buildpulse_billing_invoices to authenticated;
grant select on table public.buildpulse_billing_credit_notes to authenticated;
grant select on table public.buildpulse_crypto_accounting_evidence to authenticated;
