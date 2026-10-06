create table if not exists public.buildpulse_partnership_threads(
 id uuid primary key default gen_random_uuid(),partner_name text not null,partner_domain text,contact_email text,mailbox text not null default 'newsroom@buildpulse.news',
 external_thread_key text,status text not null default 'contacted' check(status in('research','contacted','replied','application','negotiation','approval_required','approved','declined','paused')),
 program_type text,official_route text,last_inbound_at timestamptz,last_outbound_at timestamptz,next_follow_up_at timestamptz,owner_agent text not null default 'partnerships-agent',
 notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create unique index if not exists uq_buildpulse_partnership_thread_contact on public.buildpulse_partnership_threads(lower(partner_name),coalesce(lower(contact_email),''));
create table if not exists public.buildpulse_partnership_messages(
 id uuid primary key default gen_random_uuid(),thread_id uuid not null references public.buildpulse_partnership_threads(id) on delete cascade,
 direction text not null check(direction in('inbound','outbound')),provider text not null default 'hostinger',provider_message_id text,subject text,body_excerpt text,
 received_or_sent_at timestamptz not null default now(),classification text,risk_flags text[] not null default '{}',requires_approval boolean not null default false,created_at timestamptz not null default now());
create unique index if not exists uq_buildpulse_partner_provider_message on public.buildpulse_partnership_messages(provider,provider_message_id) where provider_message_id is not null;
alter table public.buildpulse_partnership_threads enable row level security;alter table public.buildpulse_partnership_messages enable row level security;
revoke all on public.buildpulse_partnership_threads,public.buildpulse_partnership_messages from anon,authenticated;grant all on public.buildpulse_partnership_threads,public.buildpulse_partnership_messages to service_role;