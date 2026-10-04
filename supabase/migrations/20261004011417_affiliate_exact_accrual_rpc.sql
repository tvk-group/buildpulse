create or replace function public.buildpulse_affiliate_accrued_usd()
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(a.commission_amount),0)::numeric
  from public.buildpulse_affiliate_attributions a
  join public.buildpulse_affiliate_accounts acct on acct.id=a.affiliate_account_id
  where (select auth.uid()) is not null
    and acct.user_id=(select auth.uid())
    and a.fraud_state='clear'
    and a.converted_at is not null
    and a.currency='USD'
$$;

revoke all on function public.buildpulse_affiliate_accrued_usd() from public;
revoke all on function public.buildpulse_affiliate_accrued_usd() from anon;
grant execute on function public.buildpulse_affiliate_accrued_usd() to authenticated;
