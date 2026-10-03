alter table public.buildpulse_user_safety_actions add column if not exists review_status text not null default 'pending' check (review_status in ('pending','reviewed','dismissed','actioned'));
alter table public.buildpulse_user_safety_actions add column if not exists reviewed_by uuid references auth.users(id);
alter table public.buildpulse_user_safety_actions add column if not exists reviewed_at timestamptz;
alter table public.buildpulse_user_safety_actions add column if not exists review_notes text;
create index if not exists idx_bp_connections_reports_review on public.buildpulse_user_safety_actions(review_status,created_at) where action='report';