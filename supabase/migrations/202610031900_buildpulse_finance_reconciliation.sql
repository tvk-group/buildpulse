create or replace view public.buildpulse_finance_reconciliation_queue with (security_invoker=true) as
select
  'invoice'::text as item_type,
  d.id as source_id,
  d.document_number as reference_number,
  d.currency,
  d.gross_amount as amount,
  d.status,
  d.paid_at as effective_at,
  case
    when d.status='paid' and j.id is null and coalesce((d.immutable_snapshot->>'fx_posting_required')::boolean,false)=false then 'missing_journal'
    when d.status='paid' and coalesce((d.immutable_snapshot->>'fx_posting_required')::boolean,false)=true then 'fx_review_required'
    else 'ok'
  end as reconciliation_state,
  j.id as journal_id,
  j.status as journal_status
from public.buildpulse_accounting_documents d
left join public.buildpulse_journal_entries j
  on j.entity_id=d.entity_id and j.source_type='accounting_invoice' and j.source_id=d.id::text
where d.status='paid'
union all
select
  'credit_note'::text as item_type,
  c.id as source_id,
  c.credit_note_number as reference_number,
  c.currency,
  c.amount_usd as amount,
  'issued'::text as status,
  c.issued_at as effective_at,
  case
    when j.id is not null then 'ok'
    when upper(c.currency)=upper(e.base_currency) then 'missing_journal'
    else 'fx_review_required'
  end as reconciliation_state,
  j.id as journal_id,
  j.status as journal_status
from public.buildpulse_billing_credit_notes c
join public.buildpulse_billing_invoices i on i.id=c.invoice_id
join public.buildpulse_accounting_entities e on e.is_default=true
left join public.buildpulse_journal_entries j
  on j.entity_id=e.id and j.source_type='billing_credit_note' and j.source_id=c.id::text;

revoke all on public.buildpulse_finance_reconciliation_queue from anon,authenticated;
grant select on public.buildpulse_finance_reconciliation_queue to service_role;
