-- Durable route-completion control plane for BuildPulse.
-- Service-role only: route workers never receive browser/client write access.

create table if not exists public.buildpulse_route_inventory (
  id uuid primary key default gen_random_uuid(),
  route text not null unique,
  source_path text not null,
  surface text not null check (surface in ('public','auth','account','admin','workforce','advertiser','review','dynamic')),
  risk_level text not null default 'low' check (risk_level in ('low','medium','high','critical')),
  enabled boolean not null default true,
  last_audited_at timestamptz,
  last_status text not null default 'unknown' check (last_status in ('unknown','healthy','incomplete','failed','blocked')),
  findings jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.buildpulse_route_work_items (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.buildpulse_route_inventory(id) on delete cascade,
  kind text not null check (kind in ('content','ui','auth','billing','localization','seo','accessibility','integration','qa')),
  status text not null default 'queued' check (status in ('queued','claimed','awaiting_approval','completed','failed','cancelled')),
  priority smallint not null default 50 check (priority between 0 and 100),
  finding jsonb not null default '{}'::jsonb,
  claim_token uuid,
  claimed_at timestamptz,
  finished_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists buildpulse_route_work_active_unique
on public.buildpulse_route_work_items(route_id,kind)
where status in ('queued','claimed','awaiting_approval');

create index if not exists buildpulse_route_work_queue
on public.buildpulse_route_work_items(status,priority desc,created_at);

alter table public.buildpulse_route_inventory enable row level security;
alter table public.buildpulse_route_work_items enable row level security;
revoke all on public.buildpulse_route_inventory from anon,authenticated;
revoke all on public.buildpulse_route_work_items from anon,authenticated;
grant all on public.buildpulse_route_inventory to service_role;
grant all on public.buildpulse_route_work_items to service_role;

insert into public.buildpulse_agents(code,name,domain,autonomy_level,description,allowed_actions,blocked_actions,schedule_hint)
values (
 'page-completion',
 'Page Completion Agent',
 'product',
 'draft',
 'Audits BuildPulse route work items and prepares bounded implementation plans for incomplete pages and workflows.',
 array['audit_route','classify_gap','draft_page_fix','draft_localization','draft_seo','draft_accessibility_fix','request_review'],
 array['deploy','publish_unverified','move_money','change_payment_destination','change_roles','expose_secret','disable_security_control','delete_data'],
 'continuous'
)
on conflict(code) do update set
 name=excluded.name,
 description=excluded.description,
 allowed_actions=excluded.allowed_actions,
 blocked_actions=excluded.blocked_actions,
 schedule_hint=excluded.schedule_hint;

insert into public.buildpulse_agent_schedules(agent_id,name,cadence,input_template,next_run_at)
select id,'hourly-route-completion','hourly',
'Review queued BuildPulse route work and produce bounded implementation proposals. Prioritize empty/broken routes, authentication and payment correctness, then localization, SEO, accessibility and QA. Never deploy, move money, alter payment destinations, expose secrets or weaken access controls.',
now()
from public.buildpulse_agents where code='page-completion'
on conflict(agent_id,name) do nothing;
