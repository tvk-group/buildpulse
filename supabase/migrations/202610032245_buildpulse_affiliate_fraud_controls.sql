alter table public.buildpulse_affiliate_attributions add column if not exists fraud_state text not null default 'clear' check(fraud_state in ('clear','review','blocked'));
alter table public.buildpulse_affiliate_attributions add column if not exists fraud_reason text;
alter table public.buildpulse_affiliate_attributions add column if not exists fraud_reviewed_at timestamptz;
alter table public.buildpulse_affiliate_attributions add column if not exists fraud_reviewed_by uuid references auth.users(id) on delete set null;
create index if not exists idx_buildpulse_affiliate_fraud_queue on public.buildpulse_affiliate_attributions(fraud_state,converted_at desc) where fraud_state<>'clear';
create index if not exists idx_buildpulse_affiliate_fraud_reviewer on public.buildpulse_affiliate_attributions(fraud_reviewed_by) where fraud_reviewed_by is not null;
revoke all on public.buildpulse_affiliate_attributions from anon,authenticated;
grant all on public.buildpulse_affiliate_attributions to service_role;