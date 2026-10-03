create policy bp_market_inquiry_buyer_insert on public.buildpulse_marketplace_inquiries
for insert to authenticated with check(
 buyer_id=(select auth.uid())
 and buyer_id<>seller_id
 and exists(select 1 from public.buildpulse_marketplace_listings l where l.id=buildpulse_marketplace_inquiries.listing_id and l.status='active' and l.seller_id=buildpulse_marketplace_inquiries.seller_id and l.seller_id<>buyer_id)
);
grant insert on public.buildpulse_marketplace_inquiries to authenticated;

create policy bp_market_authenticated_active on public.buildpulse_marketplace_listings
for select to authenticated using(status='active');
