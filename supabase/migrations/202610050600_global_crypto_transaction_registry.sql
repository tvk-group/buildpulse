-- Global single-use registry for verified BuildPulse crypto transactions.
create table if not exists public.buildpulse_crypto_tx_registry (
  id uuid primary key default gen_random_uuid(),
  network text not null check (char_length(trim(network)) between 1 and 80),
  tx_hash text not null check (char_length(trim(tx_hash)) between 8 and 200),
  settlement_type text not null check (settlement_type in ('advertising','contributor_review','intelligence_subscription')),
  settlement_reference_id uuid not null,
  claimed_at timestamptz not null default now()
);
create unique index if not exists buildpulse_crypto_tx_registry_network_hash_key on public.buildpulse_crypto_tx_registry (lower(network),lower(tx_hash));
alter table public.buildpulse_crypto_tx_registry enable row level security;
revoke all on public.buildpulse_crypto_tx_registry from anon,authenticated;
grant select,insert on public.buildpulse_crypto_tx_registry to service_role;
insert into public.buildpulse_crypto_tx_registry(network,tx_hash,settlement_type,settlement_reference_id,claimed_at)
select network,tx_hash,'advertising',order_id,coalesce(verified_at,created_at) from public.buildpulse_crypto_accounting_evidence on conflict do nothing;
insert into public.buildpulse_crypto_tx_registry(network,tx_hash,settlement_type,settlement_reference_id,claimed_at)
select network,tx_hash,service_type,service_reference_id,created_at from public.buildpulse_service_crypto_accounting_evidence on conflict do nothing;
create or replace function public.buildpulse_claim_crypto_tx(p_network text,p_tx_hash text,p_settlement_type text,p_settlement_reference_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$ declare existing_type text; existing_ref uuid; begin
 if p_settlement_type not in ('advertising','contributor_review','intelligence_subscription') then raise exception 'invalid_settlement_type'; end if;
 if coalesce(trim(p_network),'')='' or coalesce(trim(p_tx_hash),'')='' then raise exception 'invalid_transaction_identity'; end if;
 insert into public.buildpulse_crypto_tx_registry(network,tx_hash,settlement_type,settlement_reference_id) values(trim(p_network),trim(p_tx_hash),p_settlement_type,p_settlement_reference_id) on conflict do nothing;
 select settlement_type,settlement_reference_id into existing_type,existing_ref from public.buildpulse_crypto_tx_registry where lower(network)=lower(trim(p_network)) and lower(tx_hash)=lower(trim(p_tx_hash));
 if existing_type is distinct from p_settlement_type or existing_ref is distinct from p_settlement_reference_id then raise exception 'transaction_already_used'; end if;
 return true;
end $$;
revoke all on function public.buildpulse_claim_crypto_tx(text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.buildpulse_claim_crypto_tx(text,text,text,uuid) to service_role;