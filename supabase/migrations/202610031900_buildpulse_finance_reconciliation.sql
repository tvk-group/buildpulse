create or replace view public.buildpulse_finance_reconciliation_queue with (security_invoker=true) as
select d.id as document_id,d.document_number,d.currency,d.gross_amount,d.status,d.paid_at,d.stripe_invoice_id,
 case when d.status='paid' and j.id is null and coalesce((d.immutable_snapshot->>'fx_posting_required')::boolean,false)=false then 'missing_journal'
      when d.status='paid' and coalesce((d.immutable_snapshot->>'fx_posting_required')::boolean,false)=true then 'fx_review_required'
      else 'ok' end as reconciliation_state,
 j.id as journal_id,j.status as journal_status
from public.buildpulse_accounting_documents d
left join public.buildpulse_journal_entries j on j.entity_id=d.entity_id and j.source_type='accounting_invoice' and j.source_id=d.id::text
where d.status='paid';
revoke all on public.buildpulse_finance_reconciliation_queue from anon,authenticated;
grant select on public.buildpulse_finance_reconciliation_queue to service_role;
