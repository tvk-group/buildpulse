create or replace function public.buildpulse_post_credit_note_journal(p_credit_note_id uuid)
returns uuid
language plpgsql
security definer
set search_path='public'
as $$
declare
  c public.buildpulse_billing_credit_notes%rowtype;
  i public.buildpulse_billing_invoices%rowtype;
  e public.buildpulse_accounting_entities%rowtype;
  jid uuid;
begin
  select * into c from public.buildpulse_billing_credit_notes where id=p_credit_note_id for update;
  if not found then return null; end if;
  select * into i from public.buildpulse_billing_invoices where id=c.invoice_id;
  if not found then raise exception 'invoice_not_found'; end if;
  select * into e from public.buildpulse_accounting_entities where is_default=true;
  if not found then raise exception 'accounting_entity_missing'; end if;
  if upper(c.currency)<>upper(e.base_currency) then return null; end if;

  select id into jid from public.buildpulse_journal_entries
   where entity_id=e.id and source_type='billing_credit_note' and source_id=c.id::text;
  if jid is not null then return jid; end if;

  insert into public.buildpulse_journal_entries(entity_id,entry_date,source_type,source_id,description,currency,fx_rate_to_base,status)
  values(e.id,c.issued_at::date,'billing_credit_note',c.id::text,'Credit note '||c.credit_note_number,upper(c.currency),1,'posted')
  returning id into jid;

  insert into public.buildpulse_journal_lines(entry_id,account_code,debit,credit,tax_jurisdiction,metadata) values
    (jid,'5100',c.amount_usd,0,null,jsonb_build_object('credit_note_number',c.credit_note_number,'invoice_number',i.invoice_number,'reason',c.reason)),
    (jid,'1000',0,c.amount_usd,null,jsonb_build_object('credit_note_number',c.credit_note_number,'invoice_number',i.invoice_number));

  if abs((select coalesce(sum(debit),0)-coalesce(sum(credit),0) from public.buildpulse_journal_lines where entry_id=jid))>0.000001
    then raise exception 'unbalanced journal';
  end if;
  return jid;
end $$;

revoke all on function public.buildpulse_post_credit_note_journal(uuid) from public, anon, authenticated;
grant execute on function public.buildpulse_post_credit_note_journal(uuid) to service_role;
