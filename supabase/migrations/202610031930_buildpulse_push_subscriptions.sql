create table if not exists public.buildpulse_push_subscriptions(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null,endpoint_hash text not null,p256dh text not null,auth_key text not null,user_agent text,
 enabled boolean not null default true,last_success_at timestamptz,last_failure_at timestamptz,failure_count integer not null default 0 check(failure_count>=0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,endpoint_hash));
alter table public.buildpulse_push_subscriptions enable row level security;
revoke all on public.buildpulse_push_subscriptions from anon,authenticated;
grant all on public.buildpulse_push_subscriptions to service_role;
create index if not exists idx_bp_push_user_enabled on public.buildpulse_push_subscriptions(user_id,enabled);