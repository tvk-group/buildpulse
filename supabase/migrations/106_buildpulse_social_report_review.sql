alter table public.buildpulse_social_safety_actions add column if not exists review_status text not null default 'pending' check(review_status in ('pending','reviewed','dismissed','actioned'));
alter table public.buildpulse_social_safety_actions add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.buildpulse_social_safety_actions add column if not exists reviewed_at timestamptz;
alter table public.buildpulse_social_safety_actions add column if not exists review_notes text;
create index if not exists idx_bp_social_reports_pending on public.buildpulse_social_safety_actions(review_status,created_at) where action='report';