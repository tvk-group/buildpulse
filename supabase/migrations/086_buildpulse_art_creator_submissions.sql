create table if not exists public.buildpulse_art_submissions(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 creator_name text not null,creator_email text not null,title text not null check(char_length(title) between 1 and 180),
 discipline text not null check(discipline in ('painting','photography','sculpture','illustration','digital_art','music','architecture','design','film','performance','other')),
 description text not null check(char_length(description) between 20 and 5000),portfolio_url text,media_urls text[] not null default '{}',
 rights_confirmed boolean not null default false,original_work_confirmed boolean not null default false,people_release_confirmed boolean not null default false,
 commercial_relationships text,ai_assistance_disclosure text,terms_version text not null default '2026-10-03',
 status text not null default 'draft' check(status in ('draft','submitted','review','changes_requested','approved','rejected','published','withdrawn')),
 ai_review_status text not null default 'pending' check(ai_review_status in ('pending','running','flagged','clear','failed')),ai_risk_flags jsonb not null default '[]'::jsonb,human_review_required boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),published_at timestamptz);
alter table public.buildpulse_art_submissions enable row level security;
create policy buildpulse_art_own_read on public.buildpulse_art_submissions for select to authenticated using(user_id=(select auth.uid()));
create policy buildpulse_art_own_insert on public.buildpulse_art_submissions for insert to authenticated with check(user_id=(select auth.uid()));
create policy buildpulse_art_own_update on public.buildpulse_art_submissions for update to authenticated using(user_id=(select auth.uid()) and status in ('draft','changes_requested')) with check(user_id=(select auth.uid()));
revoke all on public.buildpulse_art_submissions from anon;grant select,insert,update on public.buildpulse_art_submissions to authenticated;grant all on public.buildpulse_art_submissions to service_role;
create index if not exists idx_buildpulse_art_review on public.buildpulse_art_submissions(status,ai_review_status,created_at desc);