-- Keep authenticated invoice reads efficient and remove a duplicate story URL index.
drop policy if exists buildpulse_billing_invoices_own_read on public.buildpulse_billing_invoices;
create policy buildpulse_billing_invoices_own_read
on public.buildpulse_billing_invoices
for select to authenticated
using (user_id = (select auth.uid()));

drop index if exists public.idx_buildpulse_stories_url;
