alter table public.buildpulse_contributor_submissions add column if not exists stripe_checkout_session_id text unique;
alter table public.buildpulse_contributor_submissions add column if not exists stripe_payment_intent_id text;
alter table public.buildpulse_contributor_submissions add column if not exists paid_at timestamptz;
create index if not exists idx_bp_contributor_stripe_payment_intent on public.buildpulse_contributor_submissions(stripe_payment_intent_id) where stripe_payment_intent_id is not null;