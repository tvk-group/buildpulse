create table if not exists public.buildpulse_marketplace_inquiries(
 id uuid primary key default gen_random_uuid(),
 listing_id uuid not null references public.buildpulse_marketplace_listings(id) on delete cascade,
 buyer_id uuid not null references auth.users(id) on delete cascade,
 seller_id uuid not null references auth.users(id) on delete cascade,
 message text not null check(char_length(message) between 10 and 2000),
 status text not null default 'open' check(status in ('open','read','closed','reported')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(buyer_id<>seller_id)
);
create index if not exists idx_bp_market_inquiries_listing_created on public.buildpulse_marketplace_inquiries(listing_id,created_at desc);
create index if not exists idx_bp_market_inquiries_buyer on public.buildpulse_marketplace_inquiries(buyer_id,created_at desc);
create index if not exists idx_bp_market_inquiries_seller on public.buildpulse_marketplace_inquiries(seller_id,created_at desc);
alter table public.buildpulse_marketplace_inquiries enable row level security;
create policy bp_market_inquiry_parties_read on public.buildpulse_marketplace_inquiries for select to authenticated using(buyer_id=(select auth.uid()) or seller_id=(select auth.uid()));
revoke all on public.buildpulse_marketplace_inquiries from anon,authenticated;
grant select on public.buildpulse_marketplace_inquiries to authenticated;
grant all on public.buildpulse_marketplace_inquiries to service_role;
