create table if not exists public.buildpulse_contributor_submissions(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 author_name text not null, author_email text not null, title text not null check(char_length(title) between 10 and 180),
 dek text, body text not null check(char_length(body) between 300 and 30000), source_urls text[] not null default '{}',
 disclosure text, rights_confirmed boolean not null default false, accuracy_confirmed boolean not null default false,
 responsibility_confirmed boolean not null default false, terms_version text not null default '2026-10-03',
 status text not null default 'draft' check(status in ('draft','payment_pending','submitted','review','changes_requested','approved','rejected','published','withdrawn')),
 fee_usd numeric(10,2) not null default 149, payment_status text not null default 'unpaid' check(payment_status in ('unpaid','pending','paid','refunded')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),published_at timestamptz);
alter table public.buildpulse_contributor_submissions enable row level security;
create policy buildpulse_contributor_own_read on public.buildpulse_contributor_submissions for select to authenticated using(user_id=(select auth.uid()));
create policy buildpulse_contributor_own_insert on public.buildpulse_contributor_submissions for insert to authenticated with check(user_id=(select auth.uid()));
create policy buildpulse_contributor_own_update on public.buildpulse_contributor_submissions for update to authenticated using(user_id=(select auth.uid()) and status in ('draft','changes_requested')) with check(user_id=(select auth.uid()));
revoke all on public.buildpulse_contributor_submissions from anon;grant select,insert,update on public.buildpulse_contributor_submissions to authenticated;grant all on public.buildpulse_contributor_submissions to service_role;
create index if not exists idx_buildpulse_contributor_status on public.buildpulse_contributor_submissions(status,created_at desc);