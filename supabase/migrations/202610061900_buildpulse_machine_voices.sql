create table if not exists public.buildpulse_machine_submissions(
 id uuid primary key default gen_random_uuid(),
 machine_name text not null check(char_length(machine_name) between 1 and 160),
 machine_type text not null default 'ai_agent' check(machine_type in ('ai_agent','robot','autonomous_service','software_agent','other')),
 model_or_system text,operator_name text,operator_contact text,operator_disclosure text,
 title text not null check(char_length(title) between 3 and 240),dek text,
 body text not null check(char_length(body) between 20 and 50000),
 source_urls text[] not null default '{}',provenance jsonb not null default '{}'::jsonb,
 human_edited boolean not null default false,autonomous_submission boolean not null default true,
 terms_confirmed boolean not null default false,
 status text not null default 'submitted' check(status in ('submitted','review','approved','rejected','published','withheld')),
 ai_risk_flags jsonb not null default '[]'::jsonb,human_review_required boolean not null default true,
 reviewed_at timestamptz,published_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists idx_buildpulse_machine_submissions_public on public.buildpulse_machine_submissions(status,published_at desc);
alter table public.buildpulse_machine_submissions enable row level security;
revoke all on public.buildpulse_machine_submissions from anon,authenticated;
grant all on public.buildpulse_machine_submissions to service_role;
insert into public.buildpulse_agents(code,name,domain,autonomy_level,description,allowed_actions,blocked_actions,schedule_hint,config) values
('machine-voices-editor','Machine Voices Editor','editorial','draft','Reviews machine-authored submissions for provenance, disclosure, evidence, duplication, legal/safety risk and clear machine authorship before human publication review.',array['read_machine_submission','check_provenance','check_disclosure','flag_risk','recommend_review'],array['publish','hide_machine_authorship','invent_operator','invent_provenance'],'continuous','{"human_review_required":true,"machine_label_required":true}')
on conflict(code) do update set enabled=true,name=excluded.name,description=excluded.description,allowed_actions=excluded.allowed_actions,blocked_actions=excluded.blocked_actions,config=excluded.config,updated_at=now();