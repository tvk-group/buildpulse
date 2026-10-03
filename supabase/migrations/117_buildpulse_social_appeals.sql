create table if not exists public.buildpulse_social_appeals(
 id uuid primary key default gen_random_uuid(),
 appellant_user_id uuid not null references auth.users(id) on delete cascade,
 post_id uuid references public.buildpulse_social_posts(id) on delete set null,
 safety_action_id uuid references public.buildpulse_social_safety_actions(id) on delete set null,
 reason text not null check(char_length(reason) between 20 and 5000),
 status text not null default 'pending' check(status in ('pending','review','upheld','denied')),
 resolution_notes text,
 reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(post_id is not null or safety_action_id is not null)
);
alter table public.buildpulse_social_appeals enable row level security;
revoke all on public.buildpulse_social_appeals from anon,authenticated;
grant all on public.buildpulse_social_appeals to service_role;
create index if not exists idx_bp_social_appeals_appellant on public.buildpulse_social_appeals(appellant_user_id,created_at desc);
create index if not exists idx_bp_social_appeals_status on public.buildpulse_social_appeals(status,created_at);