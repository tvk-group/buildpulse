create table if not exists public.buildpulse_ai_usage_events(
 id uuid primary key default gen_random_uuid(),
 task text not null,
 provider text not null,
 model text not null,
 status text not null check(status in ('success','failure')),
 input_tokens bigint,
 output_tokens bigint,
 total_tokens bigint,
 duration_ms integer not null check(duration_ms>=0),
 attempt integer not null default 1 check(attempt>=1),
 error_code text,
 created_at timestamptz not null default now()
);
create index if not exists buildpulse_ai_usage_events_created_idx on public.buildpulse_ai_usage_events(created_at desc);
create index if not exists buildpulse_ai_usage_events_task_provider_idx on public.buildpulse_ai_usage_events(task,provider,created_at desc);
alter table public.buildpulse_ai_usage_events enable row level security;
revoke all on public.buildpulse_ai_usage_events from anon,authenticated;
grant all on public.buildpulse_ai_usage_events to service_role;

create table if not exists public.buildpulse_ai_budgets(
 task text primary key,
 daily_token_limit bigint check(daily_token_limit is null or daily_token_limit>0),
 daily_request_limit integer check(daily_request_limit is null or daily_request_limit>0),
 enabled boolean not null default true,
 updated_at timestamptz not null default now()
);
alter table public.buildpulse_ai_budgets enable row level security;
revoke all on public.buildpulse_ai_budgets from anon,authenticated;
grant all on public.buildpulse_ai_budgets to service_role;
