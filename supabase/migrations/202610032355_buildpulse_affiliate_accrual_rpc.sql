create or replace function public.buildpulse_affiliate_accrued_usd(p_affiliate_account_id uuid)
returns numeric
language sql
security definer
set search_path=public
as $$
  select coalesce(sum(commission_amount),0)::numeric
  from public.buildpulse_affiliate_attributions
  where affiliate_account_id=p_affiliate_account_id
    and fraud_state='clear'
    and converted_at is not null
    and currency='USD';
$$;
revoke all on function public.buildpulse_affiliate_accrued_usd(uuid) from public,anon,authenticated;
grant execute on function public.buildpulse_affiliate_accrued_usd(uuid) to service_role;
