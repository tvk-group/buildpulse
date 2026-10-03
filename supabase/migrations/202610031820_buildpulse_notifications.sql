create table if not exists public.buildpulse_notifications(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('system','social','moderation','billing','subscription','marketplace','editorial')),
 title text not null check(char_length(title) between 1 and 180),
 body text not null default '' check(char_length(body)<=2000),
 href text,
 metadata jsonb not null default '{}'::jsonb,
 read_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.buildpulse_notifications enable row level security;
revoke all on public.buildpulse_notifications from anon;
grant select,update on public.buildpulse_notifications to authenticated;
grant all on public.buildpulse_notifications to service_role;
drop policy if exists "users read own notifications" on public.buildpulse_notifications;
create policy "users read own notifications" on public.buildpulse_notifications for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "users mark own notifications read" on public.buildpulse_notifications;
create policy "users mark own notifications read" on public.buildpulse_notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create index if not exists idx_bp_notifications_user_created on public.buildpulse_notifications(user_id,created_at desc);
create index if not exists idx_bp_notifications_unread on public.buildpulse_notifications(user_id,created_at desc) where read_at is null;
