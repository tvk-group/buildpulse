-- BuildPulse premium intelligence subscriptions and affiliate attribution.
-- Paid intelligence is based on lawful public/licensed information and BuildPulse analysis; it is not MNPI or investment advice.
create table if not exists public.buildpulse_subscription_plans(
 code text primary key,name text not null,description text not null,delivery_frequency text not null check(delivery_frequency in ('daily','weekly','continuous')),
 monthly_usd numeric(10,2) not null check(monthly_usd>0),annual_usd numeric(10,2) not null check(annual_usd>0),
 stripe_product_id text not null,stripe_monthly_price_id text not null,stripe_annual_price_id text not null,
 stripe_monthly_payment_link_id text not null,stripe_annual_payment_link_id text not null,active boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.buildpulse_intelligence_subscriptions(
 id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete set null,email text not null,
 plan_code text not null references public.buildpulse_subscription_plans(code) on delete restrict,billing_interval text not null check(billing_interval in ('month','year')),
 status text not null default 'pending' check(status in ('pending','active','past_due','paused','cancelled','expired')),
 stripe_customer_id text,stripe_subscription_id text unique,stripe_checkout_session_id text unique,topics text[] not null default '{}',watchlist text[] not null default '{}',
 delivery_timezone text not null default 'UTC',marketing_consent boolean not null default false,service_email_consent boolean not null default true,
 current_period_end timestamptz,cancelled_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.buildpulse_intelligence_subscriptions enable row level security;
create table if not exists public.buildpulse_affiliate_clicks(
 id uuid primary key default gen_random_uuid(),affiliate_link_id uuid not null references public.buildpulse_affiliate_links(id) on delete cascade,
 session_key text,referrer text,user_agent_hash text,clicked_at timestamptz not null default now());
alter table public.buildpulse_affiliate_clicks enable row level security;
