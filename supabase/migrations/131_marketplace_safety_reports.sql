create table if not exists public.buildpulse_marketplace_reports(
 id uuid primary key default gen_random_uuid(),listing_id uuid not null references public.buildpulse_marketplace_listings(id) on delete cascade,
 reporter_id uuid not null,reason_code text not null check(reason_code in('fraud','counterfeit','prohibited','misleading','unsafe','other')),
 details text,status text not null default 'pending' check(status in('pending','reviewed','dismissed','actioned')),created_at timestamptz not null default now(),
 reviewed_at timestamptz,reviewed_by uuid,resolution_notes text
);
alter table public.buildpulse_marketplace_reports enable row level security;
create policy bp_market_reports_own_read on public.buildpulse_marketplace_reports for select to authenticated using(reporter_id=(select auth.uid()));
create policy bp_market_reports_own_insert on public.buildpulse_marketplace_reports for insert to authenticated with check(reporter_id=(select auth.uid()) and status='pending');
create unique index if not exists uq_bp_market_reports_pending on public.buildpulse_marketplace_reports(listing_id,reporter_id) where status='pending';
create index if not exists idx_bp_market_reports_queue on public.buildpulse_marketplace_reports(status,created_at);
