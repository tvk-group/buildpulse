-- Original BuildPulse long-form story layer. Third-party source text is evidence, not republished body copy.
create table if not exists public.buildpulse_story_articles(
 id uuid primary key default gen_random_uuid(),
 story_id uuid not null unique references public.buildpulse_stories(id) on delete cascade,
 slug text not null unique,
 headline text not null,
 dek text,
 body_markdown text not null default '',
 key_facts jsonb not null default '[]'::jsonb,
 why_it_matters text,
 context text,
 evidence jsonb not null default '[]'::jsonb,
 hero_image_url text,
 hero_image_source_url text,
 hero_image_attribution text,
 hero_image_rights_status text not null default 'unknown' check(hero_image_rights_status in ('unknown','source_permitted','licensed','public_domain','buildpulse_owned','blocked')),
 generation_state text not null default 'queued' check(generation_state in ('queued','draft','review','published','failed','withheld')),
 generated_by text,
 generated_at timestamptz,
 reviewed_at timestamptz,
 published_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists idx_buildpulse_story_articles_state on public.buildpulse_story_articles(generation_state,published_at desc);
alter table public.buildpulse_story_articles enable row level security;
revoke all on public.buildpulse_story_articles from anon,authenticated;
grant all on public.buildpulse_story_articles to service_role;

insert into public.buildpulse_agents(code,name,domain,autonomy_level,description,allowed_actions,blocked_actions,schedule_hint,config) values
('story-reporter','Story Reporting Agent','editorial','draft','Produces original BuildPulse reporting drafts from verified story evidence and permitted source material, with explicit provenance and no copying.',array['read_verified_evidence','cross_check','draft_original_article','extract_key_facts','draft_context','request_review'],array['copy_article','invent_fact','remove_provenance','publish_unverified'],'continuous','{"minimum_evidence_sources":1,"original_writing":true,"quote_limit":"brief"}'),
('story-editor','Story Editor Agent','editorial','draft','Edits BuildPulse story drafts for completeness, clarity, neutrality, attribution and evidence coverage.',array['edit_draft','check_claim_support','improve_structure','request_review'],array['invent_fact','remove_attribution','publish_unverified'],'continuous','{"sections":["lead","key_facts","details","why_it_matters","context","sources"]}'),
('story-media-rights','Story Media Rights Agent','editorial','execute_low_risk','Validates whether source imagery can be displayed and records attribution/rights state; blocks unknown media from full-article reuse.',array['inspect_media_metadata','record_attribution','classify_rights','block_unknown_media'],array['assume_license','strip_attribution','copy_blocked_media'],'continuous','{"fail_closed":true}')
on conflict(code) do update set name=excluded.name,description=excluded.description,allowed_actions=excluded.allowed_actions,blocked_actions=excluded.blocked_actions,schedule_hint=excluded.schedule_hint,config=excluded.config,enabled=true,updated_at=now();

insert into public.buildpulse_agent_schedules(agent_id,name,cadence,input_template,next_run_at)
select id,'story-enrichment','hourly',
case code when 'story-reporter' then 'Find newly verified BuildPulse stories without a complete internal article. Use verified evidence and permitted source material to draft an original BuildPulse report: lead, key facts, detailed explanation, why it matters, context and explicit source evidence. Never copy source prose or invent facts.'
when 'story-editor' then 'Review queued BuildPulse article drafts for factual support, completeness, neutrality, readability, attribution and duplication. Return unsupported claims for correction.'
else 'Review article media candidates. Record source URL, attribution and demonstrable rights status. Unknown or unsupported rights must remain blocked from article reuse.' end,
now() from public.buildpulse_agents where code in ('story-reporter','story-editor','story-media-rights')
on conflict(agent_id,name) do update set enabled=true,input_template=excluded.input_template,next_run_at=least(public.buildpulse_agent_schedules.next_run_at,now()),updated_at=now();
