create table if not exists public.buildpulse_incidents(
 id uuid primary key default gen_random_uuid(),severity text not null check(severity in ('low','medium','high','critical')),status text not null default 'open' check(status in ('open','investigating','mitigated','resolved')),
 source text not null,summary text not null,details jsonb not null default '{}'::jsonb,owner_user_id uuid references auth.users(id),opened_at timestamptz not null default now(),updated_at timestamptz not null default now(),resolved_at timestamptz);
alter table public.buildpulse_incidents enable row level security;
revoke all on public.buildpulse_incidents from anon,authenticated;grant all on public.buildpulse_incidents to service_role;
create index if not exists idx_bp_incidents_status_severity on public.buildpulse_incidents(status,severity,opened_at desc);