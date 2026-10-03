alter table public.buildpulse_contributor_submissions add column if not exists ai_review_status text not null default 'pending' check(ai_review_status in ('pending','running','flagged','clear','failed'));
alter table public.buildpulse_contributor_submissions add column if not exists ai_reviewed_at timestamptz;
alter table public.buildpulse_contributor_submissions add column if not exists ai_risk_flags jsonb not null default '[]'::jsonb;
alter table public.buildpulse_contributor_submissions add column if not exists human_review_required boolean not null default true;
create index if not exists idx_buildpulse_contributor_ai_review on public.buildpulse_contributor_submissions(ai_review_status,status,created_at);