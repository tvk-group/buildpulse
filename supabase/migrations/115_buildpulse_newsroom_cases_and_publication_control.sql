alter table public.buildpulse_stories add column if not exists publication_state text not null default 'active' check(publication_state in ('active','corrected','withheld'));
alter table public.buildpulse_stories add column if not exists correction_note text;
alter table public.buildpulse_stories add column if not exists corrected_at timestamptz;
alter table public.buildpulse_stories add column if not exists withheld_at timestamptz;
alter table public.buildpulse_stories add column if not exists publication_control_by uuid references auth.users(id) on delete set null;
alter table public.buildpulse_stories add column if not exists publication_control_reason text;
create table if not exists public.buildpulse_newsroom_cases(
 id uuid primary key default gen_random_uuid(),
 story_id uuid references public.buildpulse_stories(id) on delete set null,
 case_type text not null check(case_type in ('correction_request','complaint','takedown_request')),
 reporter_name text,
 reporter_email text,
 source_url text,
 details text not null check(char_length(details) between 20 and 10000),
 status text not null default 'open' check(status in ('open','review','resolved','dismissed')),
 resolution_action text check(resolution_action is null or resolution_action in ('none','corrected','withheld','restored')),
 resolution_notes text,
 reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.buildpulse_newsroom_cases enable row level security;
revoke all on public.buildpulse_newsroom_cases from anon,authenticated;
grant all on public.buildpulse_newsroom_cases to service_role;
create index if not exists idx_bp_newsroom_cases_status on public.buildpulse_newsroom_cases(status,created_at);
create index if not exists idx_bp_newsroom_cases_story on public.buildpulse_newsroom_cases(story_id,created_at desc);
create index if not exists idx_bp_story_publication_state on public.buildpulse_stories(publication_state,published_at desc);