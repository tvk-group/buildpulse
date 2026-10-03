create table if not exists public.buildpulse_ai_prompt_versions(
 id uuid primary key default gen_random_uuid(),
 prompt_key text not null,
 version integer not null check(version>0),
 task text not null,
 system_prompt text not null,
 status text not null default 'draft' check(status in ('draft','active','retired')),
 source_grounding_required boolean not null default true,
 created_by uuid references auth.users(id) on delete set null,
 approved_by uuid references auth.users(id) on delete set null,
 approved_at timestamptz,
 created_at timestamptz not null default now(),
 unique(prompt_key,version)
);
create unique index if not exists idx_bp_ai_prompt_one_active on public.buildpulse_ai_prompt_versions(prompt_key) where status='active';
create table if not exists public.buildpulse_ai_evaluation_cases(
 id uuid primary key default gen_random_uuid(),
 prompt_key text not null,
 name text not null,
 input_fixture jsonb not null default '{}'::jsonb,
 required_source_terms text[] not null default '{}',
 forbidden_claim_terms text[] not null default '{}',
 enabled boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.buildpulse_ai_prompt_versions enable row level security;
alter table public.buildpulse_ai_evaluation_cases enable row level security;
revoke all on public.buildpulse_ai_prompt_versions from anon,authenticated;
revoke all on public.buildpulse_ai_evaluation_cases from anon,authenticated;
grant all on public.buildpulse_ai_prompt_versions to service_role;
grant all on public.buildpulse_ai_evaluation_cases to service_role;
alter table public.buildpulse_ai_usage_events add column if not exists prompt_key text;
alter table public.buildpulse_ai_usage_events add column if not exists prompt_version integer;