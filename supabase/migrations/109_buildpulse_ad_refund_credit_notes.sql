-- Sequential, immutable credit-note evidence for advertising refunds.
CREATE TABLE IF NOT EXISTS public.buildpulse_billing_credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.buildpulse_billing_invoices(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  credit_note_number text NOT NULL UNIQUE,
  amount_usd numeric(12,2) NOT NULL CHECK (amount_usd > 0),
  currency text NOT NULL DEFAULT 'USD',
  reason text NOT NULL DEFAULT 'refund',
  provider_reference text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.buildpulse_billing_credit_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS buildpulse_billing_credit_notes_own_read ON public.buildpulse_billing_credit_notes;
CREATE POLICY buildpulse_billing_credit_notes_own_read ON public.buildpulse_billing_credit_notes
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
GRANT SELECT ON public.buildpulse_billing_credit_notes TO authenticated;
GRANT ALL ON public.buildpulse_billing_credit_notes TO service_role;

CREATE OR REPLACE FUNCTION public.buildpulse_issue_ad_credit_note(
  p_order_id uuid,
  p_amount_usd numeric,
  p_provider_reference text,
  p_reason text DEFAULT 'refund',
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS TABLE(id uuid, credit_note_number text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inv public.buildpulse_billing_invoices%rowtype; ent uuid; num text; created uuid;
BEGIN
  IF p_amount_usd IS NULL OR p_amount_usd <= 0 THEN RAISE EXCEPTION 'invalid_credit_amount'; END IF;
  IF coalesce(trim(p_provider_reference),'')='' THEN RAISE EXCEPTION 'provider_reference_required'; END IF;
  SELECT c.id,c.credit_note_number INTO id,credit_note_number
    FROM public.buildpulse_billing_credit_notes c WHERE c.provider_reference=p_provider_reference;
  IF id IS NOT NULL THEN RETURN NEXT; RETURN; END IF;
  SELECT * INTO inv FROM public.buildpulse_billing_invoices WHERE order_id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_not_found'; END IF;
  SELECT e.id INTO ent FROM public.buildpulse_accounting_entities e WHERE e.is_default=true;
  IF ent IS NULL THEN RAISE EXCEPTION 'accounting_entity_missing'; END IF;
  num:=public.buildpulse_next_document_number(ent,'credit_note',now());
  INSERT INTO public.buildpulse_billing_credit_notes(invoice_id,user_id,credit_note_number,amount_usd,currency,reason,provider_reference,metadata)
  VALUES(inv.id,inv.user_id,num,p_amount_usd,inv.currency,coalesce(nullif(trim(p_reason),''),'refund'),p_provider_reference,coalesce(p_metadata,'{}'::jsonb))
  RETURNING buildpulse_billing_credit_notes.id INTO created;
  id:=created;credit_note_number:=num;RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION public.buildpulse_issue_ad_credit_note(uuid,numeric,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buildpulse_issue_ad_credit_note(uuid,numeric,text,text,jsonb) TO service_role;
