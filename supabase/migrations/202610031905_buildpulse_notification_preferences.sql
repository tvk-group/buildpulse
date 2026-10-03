create table if not exists public.buildpulse_notification_preferences(
 user_id uuid primary key references auth.users(id) on delete cascade,
 in_app_enabled boolean not null default true,
 social_enabled boolean not null default true,
 moderation_enabled boolean not null default true,
 billing_enabled boolean not null default true,
 subscription_enabled boolean not null default true,
 marketplace_enabled boolean not null default true,
 editorial_enabled boolean not null default true,
 push_enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.buildpulse_notification_preferences enable row level security;
revoke all on public.buildpulse_notification_preferences from anon;
grant select,insert,update on public.buildpulse_notification_preferences to authenticated;
grant all on public.buildpulse_notification_preferences to service_role;
drop policy if exists "users read own notification preferences" on public.buildpulse_notification_preferences;
create policy "users read own notification preferences" on public.buildpulse_notification_preferences for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "users create own notification preferences" on public.buildpulse_notification_preferences;
create policy "users create own notification preferences" on public.buildpulse_notification_preferences for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists "users update own notification preferences" on public.buildpulse_notification_preferences;
create policy "users update own notification preferences" on public.buildpulse_notification_preferences for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));