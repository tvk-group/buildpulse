drop policy if exists bp_market_own_select on public.buildpulse_marketplace_listings;
drop policy if exists bp_market_authenticated_active on public.buildpulse_marketplace_listings;
create policy bp_market_authenticated_read on public.buildpulse_marketplace_listings
for select to authenticated using(seller_id=(select auth.uid()) or status='active');
create index if not exists idx_bp_service_crypto_accounting_user on public.buildpulse_service_crypto_accounting_evidence(user_id);
