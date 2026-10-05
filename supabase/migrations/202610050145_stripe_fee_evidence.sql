-- Authoritative Stripe fee evidence ledger primitive.
-- Evidence must come from Stripe balance transactions; percentage estimates are not accepted.
create table if not exists public.buildpulse_stripe_fee_evidence(
 id uuid primary key default gen_random_uuid(),entity_id uuid not null references public.buildpulse_accounting_entities(id),
 stripe_balance_transaction_id text not null unique,stripe_payment_intent_id text,stripe_charge_id text,
 currency text not null,fee_amount numeric(20,6) not null check(fee_amount>=0),net_amount numeric(20,6),
 available_on date,raw_evidence jsonb not null default '{}'::jsonb,verified_at timestamptz not null default now(),created_at timestamptz not null default now());
alter table public.buildpulse_stripe_fee_evidence enable row level security;
revoke all on table public.buildpulse_stripe_fee_evidence from public,anon,authenticated;
grant select,insert,update on table public.buildpulse_stripe_fee_evidence to service_role;

create or replace function public.buildpulse_post_stripe_fee_journal(p_evidence_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare f public.buildpulse_stripe_fee_evidence%rowtype;e public.buildpulse_accounting_entities%rowtype;jid uuid;
begin
 select * into f from public.buildpulse_stripe_fee_evidence where id=p_evidence_id for update;if not found or f.fee_amount<=0 then return null;end if;
 select * into e from public.buildpulse_accounting_entities where id=f.entity_id;if upper(f.currency)<>upper(e.base_currency) then return null;end if;
 insert into public.buildpulse_journal_entries(entity_id,entry_date,source_type,source_id,description,currency,fx_rate_to_base,status)
 values(f.entity_id,coalesce(f.available_on,current_date),'stripe_processing_fee',f.stripe_balance_transaction_id,'Stripe processing fee '||f.stripe_balance_transaction_id,upper(f.currency),1,'posted')
 on conflict(entity_id,source_type,source_id) do nothing returning id into jid;
 if jid is null then select id into jid from public.buildpulse_journal_entries where entity_id=f.entity_id and source_type='stripe_processing_fee' and source_id=f.stripe_balance_transaction_id;return jid;end if;
 insert into public.buildpulse_journal_lines(entry_id,account_code,debit,credit,metadata)
 values(jid,'5000',f.fee_amount,0,jsonb_build_object('stripe_balance_transaction_id',f.stripe_balance_transaction_id,'evidence_id',f.id)),
 (jid,'1000',0,f.fee_amount,jsonb_build_object('stripe_balance_transaction_id',f.stripe_balance_transaction_id,'evidence_id',f.id));
 return jid;
end $$;
revoke all on function public.buildpulse_post_stripe_fee_journal(uuid) from public,anon,authenticated;
grant execute on function public.buildpulse_post_stripe_fee_journal(uuid) to service_role;