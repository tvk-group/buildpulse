create table if not exists public.buildpulse_ai_evaluation_runs(
 id uuid primary key default gen_random_uuid(),
 evaluation_case_id uuid not null references public.buildpulse_ai_evaluation_cases(id) on delete cascade,
 prompt_key text not null,
 prompt_version integer not null,
 provider text not null,
 model text not null,
 passed boolean not null,
 required_terms_missing text[] not null default '{}',
 forbidden_terms_found text[] not null default '{}',
 source_urls_missing text[] not null default '{}',
 output_excerpt text,
 run_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index if not exists idx_bp_ai_eval_runs_case_created on public.buildpulse_ai_evaluation_runs(evaluation_case_id,created_at desc);
create index if not exists idx_bp_ai_eval_runs_prompt_created on public.buildpulse_ai_evaluation_runs(prompt_key,created_at desc);
create index if not exists idx_bp_ai_eval_runs_run_by on public.buildpulse_ai_evaluation_runs(run_by);
alter table public.buildpulse_ai_evaluation_runs enable row level security;
revoke all on public.buildpulse_ai_evaluation_runs from anon,authenticated;
grant all on public.buildpulse_ai_evaluation_runs to service_role;
