drop policy if exists subscription_crypto_owner_read on public.buildpulse_subscription_crypto_payments;
create policy subscription_crypto_owner_read on public.buildpulse_subscription_crypto_payments
for select to authenticated using(user_id=(select auth.uid()));

create index if not exists idx_bp_ai_prompt_created_by on public.buildpulse_ai_prompt_versions(created_by);
create index if not exists idx_bp_ai_prompt_approved_by on public.buildpulse_ai_prompt_versions(approved_by);
create index if not exists idx_bp_subscription_crypto_plan on public.buildpulse_subscription_crypto_payments(plan_code);
