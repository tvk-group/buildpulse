create table if not exists public.buildpulse_editorial_cases(
 id uuid primary key default gen_random_uuid(),
 case_type text not null check(case_type in ('correction','complaint','takedown')),
 status text not null default 'open' check(status in ('open','triage','investigating','resolved','rejected')),
 target_url text not null,
 contact_email text not null,
 summary text not null,
 evidence text,
 resolution text,
 assigned_to uuid references auth.users(id) on delete set null,
 resolved_by uuid references auth.users(id) on delete set null,
 resolved_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.buildpulse_editorial_cases enable row level security;
revoke all on public.buildpulse_editorial_cases from anon,authenticated;
grant all on public.buildpulse_editorial_cases to service_role;
create index if not exists idx_bp_editorial_cases_status_created on public.buildpulse_editorial_cases(status,created_at desc);
create index if not exists idx_bp_editorial_cases_contact_created on public.buildpulse_editorial_cases(lower(contact_email),created_at desc);
create index if not exists idx_bp_editorial_cases_assigned on public.buildpulse_editorial_cases(assigned_to,status) where assigned_to is not null;
