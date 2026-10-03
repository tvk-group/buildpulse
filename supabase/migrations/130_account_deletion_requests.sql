create table if not exists public.buildpulse_account_deletion_requests(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in('pending','cancelled','processing','completed','failed')),
 requested_at timestamptz not null default now(),
 eligible_at timestamptz not null default(now()+interval '7 days'),
 cancelled_at timestamptz,completed_at timestamptz,last_error text,
 updated_at timestamptz not null default now()
);
alter table public.buildpulse_account_deletion_requests enable row level security;
create policy bp_account_deletion_own_read on public.buildpulse_account_deletion_requests for select to authenticated using(user_id=(select auth.uid()));
create policy bp_account_deletion_own_insert on public.buildpulse_account_deletion_requests for insert to authenticated with check(user_id=(select auth.uid()) and status='pending');
create policy bp_account_deletion_own_cancel on public.buildpulse_account_deletion_requests for update to authenticated using(user_id=(select auth.uid()) and status='pending') with check(user_id=(select auth.uid()) and status='cancelled');
create index if not exists idx_bp_account_deletion_due on public.buildpulse_account_deletion_requests(eligible_at) where status='pending';
