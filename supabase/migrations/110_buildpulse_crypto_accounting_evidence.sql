-- Immutable accounting evidence for verified off-Stripe crypto advertising settlements.
CREATE TABLE IF NOT EXISTS public.buildpulse_crypto_accounting_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.buildpulse_ad_orders(id) ON DELETE RESTRICT,
  invoice_id uuid NOT NULL UNIQUE REFERENCES public.buildpulse_billing_invoices(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  quote_id uuid NOT NULL REFERENCES public.buildpulse_ad_payment_quotes(id) ON DELETE RESTRICT,
  asset text NOT NULL,
  network text NOT NULL,
  tx_hash text NOT NULL,
  destination text NOT NULL,
  expected_crypto_amount numeric NOT NULL CHECK(expected_crypto_amount > 0),
  observed_crypto_amount numeric NOT NULL CHECK(observed_crypto_amount > 0),
  quote_rate_usd numeric NOT NULL CHECK(quote_rate_usd > 0),
  gross_amount_usd numeric(12,2) NOT NULL CHECK(gross_amount_usd > 0),
  confirmations integer NOT NULL CHECK(confirmations >= 0),
  verified_at timestamptz NOT NULL DEFAULT now(),
  verifier text NOT NULL,
  tax_status text NOT NULL DEFAULT 'pending_determination' CHECK(tax_status IN ('pending_determination','determined','not_applicable')),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(network,tx_hash)
);
ALTER TABLE public.buildpulse_crypto_accounting_evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS buildpulse_crypto_accounting_evidence_own_read ON public.buildpulse_crypto_accounting_evidence;
CREATE POLICY buildpulse_crypto_accounting_evidence_own_read ON public.buildpulse_crypto_accounting_evidence
  FOR SELECT TO authenticated USING ((select auth.uid())=user_id);
GRANT SELECT ON public.buildpulse_crypto_accounting_evidence TO authenticated;
GRANT ALL ON public.buildpulse_crypto_accounting_evidence TO service_role;
COMMENT ON TABLE public.buildpulse_crypto_accounting_evidence IS
'Immutable settlement evidence for on-chain verified BuildPulse advertising payments. Tax remains pending until jurisdiction/treatment is authoritatively determined.';
