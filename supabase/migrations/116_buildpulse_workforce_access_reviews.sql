create table if not exists public.buildpulse_workforce_access_reviews(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 reviewer_id uuid not null references auth.users(id) on delete restrict,
 decision text not null check(decision in ('retain','revoke')),
 roles_snapshot jsonb not null default '[]'::jsonb,
 profile_snapshot jsonb not null default '{}'::jsonb,
 notes text not null,
 reviewed_at timestamptz not null default now()
);
alter table public.buildpulse_workforce_access_reviews enable row level security;
revoke all on public.buildpulse_workforce_access_reviews from anon,authenticated;
grant all on public.buildpulse_workforce_access_reviews to service_role;
create index if not exists idx_bp_workforce_access_reviews_user on public.buildpulse_workforce_access_reviews(user_id,reviewed_at desc);
create index if not exists idx_bp_workforce_access_reviews_reviewer on public.buildpulse_workforce_access_reviews(reviewer_id,reviewed_at desc);