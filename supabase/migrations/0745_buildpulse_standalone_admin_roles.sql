-- BuildPulse standalone admin authorization dependency.
-- Must exist before admin-ad-control migrations are applied.
create table if not exists public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id,role)
);
alter table public.role_assignments enable row level security;
revoke all on public.role_assignments from anon, authenticated;
grant all on public.role_assignments to service_role;
