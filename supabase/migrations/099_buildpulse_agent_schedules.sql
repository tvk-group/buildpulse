create table if not exists public.buildpulse_agent_schedules(
 id uuid primary key default gen_random_uuid(),
 agent_id uuid not null references public.buildpulse_agents(id) on delete cascade,
 name text not null,
 cadence text not null check(cadence in ('hourly','daily','weekly','manual')),
 hour_utc smallint check(hour_utc between 0 and 23),
 day_of_week smallint check(day_of_week between 0 and 6),
 enabled boolean not null default true,
 input_template text not null,
 last_run_at timestamptz,
 next_run_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(agent_id,name)
);
alter table public.buildpulse_agent_schedules enable row level security;
revoke all on public.buildpulse_agent_schedules from anon,authenticated;
grant all on public.buildpulse_agent_schedules to service_role;
create index if not exists idx_buildpulse_agent_schedules_due on public.buildpulse_agent_schedules(enabled,next_run_at);
insert into public.buildpulse_agent_schedules(agent_id,name,cadence,hour_utc,input_template,next_run_at)
select id,'daily-standard','daily',6,'Review the last 24 hours of verified BuildPulse operational data in your domain. Produce only the allowed outputs, flag uncertainty, and do not perform blocked actions.',now()
from public.buildpulse_agents where code in ('news-desk','finance-reconcile','platform-ops')
on conflict(agent_id,name) do nothing;
insert into public.buildpulse_agent_schedules(agent_id,name,cadence,input_template,next_run_at)
select id,'hourly-standard','hourly','Review new BuildPulse records in your domain since the previous successful run. Produce only low-risk proposed work, preserving provenance and auditability.',now()
from public.buildpulse_agents where code in ('localization','social-ops','moderation')
on conflict(agent_id,name) do nothing;