create policy bp_market_inquiry_buyer_insert on public.buildpulse_marketplace_inquiries
for insert to authenticated with check(
 buyer_id=(select auth.uid())
 and buyer_id<>seller_id
 and exists(select 1 from public.buildpulse_marketplace_listings l where l.id=listing_id and l.status='active' and l.seller_id=seller_id)
);
grant insert on public.buildpulse_marketplace_inquiries to authenticated;
