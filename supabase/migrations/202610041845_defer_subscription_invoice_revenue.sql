-- Prospectively defer base-currency subscription invoice revenue until service-period recognition.
-- Production had zero subscription accounting documents/journals at introduction, so no historical rewrite is required.
create or replace function public.buildpulse_post_paid_invoice_journal(p_document_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare d public.buildpulse_accounting_documents%rowtype;e public.buildpulse_accounting_entities%rowtype;jid uuid;revenue_code text;has_service_period boolean:=false;
begin
 select * into d from public.buildpulse_accounting_documents where id=p_document_id for update;
 if not found or d.status<>'paid' then return null;end if;
 select * into e from public.buildpulse_accounting_entities where id=d.entity_id;
 if upper(d.currency)<>upper(e.base_currency) then return null;end if;
 select id into jid from public.buildpulse_journal_entries where entity_id=d.entity_id and source_type='accounting_invoice' and source_id=d.id::text;
 if jid is not null then return jid;end if;
 if d.stripe_subscription_id is not null then
  has_service_period:=jsonb_typeof(d.immutable_snapshot->'service_periods')='array' and jsonb_array_length(d.immutable_snapshot->'service_periods')>0;
  if not has_service_period then return null;end if;
  revenue_code:='2100';
 else revenue_code:='4010';end if;
 insert into public.buildpulse_journal_entries(entity_id,entry_date,source_type,source_id,description,currency,fx_rate_to_base,status)
 values(d.entity_id,coalesce(d.paid_at,d.issued_at,now())::date,'accounting_invoice',d.id::text,'Paid invoice '||d.document_number,upper(d.currency),1,'posted') returning id into jid;
 insert into public.buildpulse_journal_lines(entry_id,account_code,debit,credit,tax_jurisdiction,metadata)
 values(jid,'1000',d.gross_amount,0,d.tax_jurisdiction,jsonb_build_object('document_number',d.document_number)),
 (jid,revenue_code,0,d.net_amount,d.tax_jurisdiction,jsonb_build_object('document_number',d.document_number,'subscription_deferred',d.stripe_subscription_id is not null));
 if d.tax_amount>0 then insert into public.buildpulse_journal_lines(entry_id,account_code,debit,credit,tax_jurisdiction,metadata)
 values(jid,'2000',0,d.tax_amount,d.tax_jurisdiction,jsonb_build_object('document_number',d.document_number));end if;
 if abs((select coalesce(sum(debit),0)-coalesce(sum(credit),0) from public.buildpulse_journal_lines where entry_id=jid))>0.000001 then raise exception 'unbalanced journal';end if;
 return jid;
end $$;
revoke all on function public.buildpulse_post_paid_invoice_journal(uuid) from public,anon,authenticated;
grant execute on function public.buildpulse_post_paid_invoice_journal(uuid) to service_role;
