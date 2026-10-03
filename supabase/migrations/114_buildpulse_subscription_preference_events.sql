create table if not exists public.buildpulse_subscription_preference_events(
 id uuid primary key default gen_random_uuid(),
 subscription_id uuid not null references public.buildpulse_intelligence_subscriptions(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 event_type text not null check(event_type in ('preferences_updated','service_email_enabled','service_email_disabled','marketing_enabled','marketing_disabled')),
 snapshot jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.buildpulse_subscription_preference_events enable row level security;
revoke all on public.buildpulse_subscription_preference_events from anon,authenticated;
grant all on public.buildpulse_subscription_preference_events to service_role;
create index if not exists idx_bp_subscription_pref_events_user on public.buildpulse_subscription_preference_events(user_id,created_at desc);
create index if not exists idx_bp_subscription_pref_events_subscription on public.buildpulse_subscription_preference_events(subscription_id,created_at desc);