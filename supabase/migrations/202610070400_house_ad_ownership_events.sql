alter table public.buildpulse_house_ads add column if not exists advertiser_user_id uuid references auth.users(id) on delete set null;

create table if not exists public.buildpulse_house_ad_events(
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.buildpulse_house_ads(id) on delete cascade,
  event_type text not null check(event_type in ('impression','click')),
  event_key text not null unique,
  is_verified boolean not null default false,
  rejection_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.buildpulse_house_ad_events enable row level security;
revoke all on public.buildpulse_house_ad_events from anon,authenticated;
grant all on public.buildpulse_house_ad_events to service_role;
create index if not exists buildpulse_house_ad_events_campaign_created_idx on public.buildpulse_house_ad_events(campaign_id,created_at desc);
