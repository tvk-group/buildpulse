create table if not exists public.buildpulse_outbound_partners(
 id uuid primary key default gen_random_uuid(),name text not null,domain text not null unique,
 commercial_model text not null default 'none' check(commercial_model in('none','cpc','cpa','revenue_share','fixed')),
 status text not null default 'draft' check(status in('draft','active','paused','ended')),
 tracking_template text,click_rate numeric(18,6),currency text not null default 'USD',
 settlement_method text not null default 'bank' check(settlement_method in('bank','crypto','platform','manual')),
 settlement_terms text,disclosure text,contract_reference text,editorial_independence boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.buildpulse_outbound_clicks(
 id uuid primary key default gen_random_uuid(),story_id uuid references public.buildpulse_stories(id) on delete set null,
 partner_id uuid references public.buildpulse_outbound_partners(id) on delete set null,destination_host text not null,destination_url text not null,
 commercial boolean not null default false,visitor_hash text,ua_hash text,referrer_path text,clicked_at timestamptz not null default now(),
 eligible_revenue numeric(18,6),currency text,settlement_state text not null default 'unreported' check(settlement_state in('unreported','reported','approved','paid','rejected')),
 metadata jsonb not null default '{}'::jsonb
);
create index if not exists idx_buildpulse_outbound_clicks_partner_time on public.buildpulse_outbound_clicks(partner_id,clicked_at desc);
create table if not exists public.buildpulse_outbound_settlements(
 id uuid primary key default gen_random_uuid(),partner_id uuid not null references public.buildpulse_outbound_partners(id) on delete restrict,
 period_start date not null,period_end date not null,currency text not null,gross_amount numeric(18,6) not null default 0,
 adjustments numeric(18,6) not null default 0,net_amount numeric(18,6) not null default 0,
 status text not null default 'pending' check(status in('pending','reconciled','invoiced','paid','disputed','void')),
 payment_method text,payment_reference text,paid_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(partner_id,period_start,period_end,currency)
);
alter table public.buildpulse_outbound_partners enable row level security;
alter table public.buildpulse_outbound_clicks enable row level security;
alter table public.buildpulse_outbound_settlements enable row level security;
revoke all on public.buildpulse_outbound_partners,public.buildpulse_outbound_clicks,public.buildpulse_outbound_settlements from anon,authenticated;
grant all on public.buildpulse_outbound_partners,public.buildpulse_outbound_clicks,public.buildpulse_outbound_settlements to service_role;