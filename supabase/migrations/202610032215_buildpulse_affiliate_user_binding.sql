alter table public.buildpulse_affiliate_attributions add column if not exists attributed_user_id uuid references auth.users(id) on delete set null;
create index if not exists idx_buildpulse_affiliate_attributions_user_pending on public.buildpulse_affiliate_attributions(attributed_user_id,landing_at desc) where converted_at is null;
revoke all on public.buildpulse_affiliate_attributions from anon,authenticated;
grant all on public.buildpulse_affiliate_attributions to service_role;