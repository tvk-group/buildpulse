-- Safe, bounded reconciliation remediation. FX-review rows are intentionally excluded.
create or replace function public.buildpulse_remediate_safe_reconciliation(p_limit integer default 25)
returns table(item_type text, source_id uuid, journal_id uuid, outcome text)
language plpgsql security definer set search_path=public
as $$
declare r record; jid uuid;
begin
 if coalesce(p_limit,0)<1 or p_limit>100 then raise exception 'invalid_limit'; end if;
 for r in
  select q.item_type,q.source_id
  from public.buildpulse_finance_reconciliation_queue q
  where q.reconciliation_state='missing_journal'
  order by q.paid_at nulls last,q.reference_number
  limit p_limit
 loop
  jid:=null;
  if r.item_type='invoice' then
   jid:=public.buildpulse_post_paid_invoice_journal(r.source_id);
  elsif r.item_type='credit_note' then
   jid:=public.buildpulse_post_credit_note_journal(r.source_id);
  else
   continue;
  end if;
  item_type:=r.item_type; source_id:=r.source_id; journal_id:=jid;
  outcome:=case when jid is null then 'not_posted' else 'posted' end;
  return next;
 end loop;
 return;
end $$;
revoke all on function public.buildpulse_remediate_safe_reconciliation(integer) from public,anon,authenticated;
grant execute on function public.buildpulse_remediate_safe_reconciliation(integer) to service_role;
