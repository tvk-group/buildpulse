CREATE OR REPLACE FUNCTION public.buildpulse_finalize_crypto_ad_payment(
  p_order_id uuid,
  p_quote_id uuid,
  p_provider_event_key text,
  p_tx_hash text,
  p_observed_amount numeric,
  p_confirmations integer,
  p_verified_at timestamptz DEFAULT now()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  q public.buildpulse_ad_payment_quotes%rowtype;
  inv public.buildpulse_billing_invoices%rowtype;
  existing_order uuid;
BEGIN
  SELECT * INTO q FROM public.buildpulse_ad_payment_quotes WHERE id=p_quote_id AND order_id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment_quote_not_found'; END IF;
  IF q.state NOT IN ('open','observed','confirmed') THEN RAISE EXCEPTION 'payment_quote_not_settleable'; END IF;
  IF p_observed_amount < q.expected_amount THEN RAISE EXCEPTION 'payment_underpaid'; END IF;
  IF p_confirmations < q.required_confirmations THEN RAISE EXCEPTION 'insufficient_confirmations'; END IF;

  SELECT * INTO inv FROM public.buildpulse_billing_invoices WHERE order_id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_not_found'; END IF;

  SELECT order_id INTO existing_order FROM public.buildpulse_ad_payment_events WHERE provider_event_key=p_provider_event_key;
  IF existing_order IS NOT NULL AND existing_order<>p_order_id THEN RAISE EXCEPTION 'transaction_already_used'; END IF;

  INSERT INTO public.buildpulse_ad_payment_events(
    order_id,provider_event_key,crypto_asset,crypto_network,tx_hash,observed_amount,confirmations,state,metadata
  ) VALUES(
    p_order_id,p_provider_event_key,q.asset,q.network,p_tx_hash,p_observed_amount,p_confirmations,'confirmed',
    jsonb_build_object('provider','buildpulse_supabase_onchain_verifier','quote_id',q.id,'onchain_verified',true,'required_confirmations',q.required_confirmations)
  ) ON CONFLICT(provider_event_key) DO NOTHING;

  UPDATE public.buildpulse_ad_payment_quotes SET state='confirmed' WHERE id=q.id;
  UPDATE public.buildpulse_ad_orders SET
    status='review',paid_tx_hash=p_tx_hash,paid_at=p_verified_at,payment_method=q.asset,payment_provider='crypto',
    payment_reference=q.id::text,updated_at=p_verified_at
    WHERE id=p_order_id AND status IN ('awaiting_payment','payment_detected','review');

  UPDATE public.buildpulse_billing_invoices SET
    status='paid',paid_at=coalesce(paid_at,p_verified_at),payment_method=q.asset,payment_reference=q.id::text,updated_at=p_verified_at,
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('tx_hash',p_tx_hash,'asset',q.asset,'network',q.network,'amount',p_observed_amount,'onchain_verified',true)
    WHERE id=inv.id;

  INSERT INTO public.buildpulse_crypto_accounting_evidence(
    order_id,invoice_id,user_id,quote_id,asset,network,tx_hash,destination,expected_crypto_amount,observed_crypto_amount,
    quote_rate_usd,gross_amount_usd,confirmations,verified_at,verifier,tax_status,evidence
  ) VALUES(
    p_order_id,inv.id,inv.user_id,q.id,q.asset,q.network,p_tx_hash,q.destination,q.expected_amount,p_observed_amount,
    q.rate_usd,inv.amount_usd,p_confirmations,p_verified_at,'buildpulse_supabase_onchain_verifier','pending_determination',
    jsonb_build_object('quoted_at',q.quoted_at,'expires_at',q.expires_at,'required_confirmations',q.required_confirmations,'onchain_verified',true)
  ) ON CONFLICT(order_id) DO NOTHING;

  RETURN jsonb_build_object('settled',true,'invoice_number',inv.invoice_number,'asset',q.asset,'network',q.network);
END $$;
REVOKE ALL ON FUNCTION public.buildpulse_finalize_crypto_ad_payment(uuid,uuid,text,text,numeric,integer,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buildpulse_finalize_crypto_ad_payment(uuid,uuid,text,text,numeric,integer,timestamptz) TO service_role;
COMMENT ON FUNCTION public.buildpulse_finalize_crypto_ad_payment(uuid,uuid,text,text,numeric,integer,timestamptz) IS
'Atomically persists a service-verified BuildPulse crypto advertising settlement, invoice state, payment event and immutable accounting evidence.';
