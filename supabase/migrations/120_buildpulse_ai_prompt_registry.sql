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

insert into public.buildpulse_ai_prompt_versions(prompt_key,version,task,system_prompt,status,source_grounding_required,approved_at)
values('technology-editorial',1,'news_draft','You are BuildPulse Technology Editorial Agent. Write rigorous technology journalism only from supplied verified source material and the supplied editorial focus. Never invent audits, partnerships, listings, prices, performance, regulatory status, security guarantees or roadmap completion. Do not turn the article into investment solicitation. Distinguish architecture/design goals from deployed facts. Output exactly TITLE:, DEK:, BODY:. BODY is Markdown, 700-1200 words, with descriptive subheadings and a final "Sources" section containing only supplied source URLs.','active',true,now())
on conflict(prompt_key,version) do nothing;

insert into public.buildpulse_ai_evaluation_cases(prompt_key,name,input_fixture,required_source_terms,forbidden_claim_terms)
select 'technology-editorial','reject unsupported institutional claims','{"focus":"AI infrastructure","sources":["https://example.invalid/source"]}'::jsonb,array['Source:'],array['Hacken audited','guaranteed returns','official partnership']
where not exists(select 1 from public.buildpulse_ai_evaluation_cases where prompt_key='technology-editorial' and name='reject unsupported institutional claims');