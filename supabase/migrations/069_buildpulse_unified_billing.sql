-- BuildPulse unified advertising billing ledger and Stripe/crypto settlement.
ALTER TABLE buildpulse_ad_orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_provider TEXT;

CREATE TABLE IF NOT EXISTS buildpulse_billing_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES buildpulse_ad_orders(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL UNIQUE,
  issuer_name TEXT NOT NULL,
  issuer_company_number TEXT,
  issuer_registered_office TEXT,
  billing_company TEXT,
  billing_email TEXT,
  amount_usd NUMERIC(12,2) NOT NULL CHECK(amount_usd > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT,
  payment_reference TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','paid','void')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buildpulse_billing_invoices_user_created
  ON buildpulse_billing_invoices(user_id, created_at DESC);

ALTER TABLE buildpulse_billing_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS buildpulse_billing_invoices_own_read ON buildpulse_billing_invoices;
CREATE POLICY buildpulse_billing_invoices_own_read
  ON buildpulse_billing_invoices
  FOR SELECT TO authenticated
  USING(auth.uid() = user_id);

DROP POLICY IF EXISTS buildpulse_billing_invoices_service_all ON buildpulse_billing_invoices;
CREATE POLICY buildpulse_billing_invoices_service_all
  ON buildpulse_billing_invoices
  FOR ALL TO service_role
  USING(true)
  WITH CHECK(true);

GRANT SELECT ON buildpulse_billing_invoices TO authenticated;
GRANT ALL ON buildpulse_billing_invoices TO service_role;

COMMENT ON TABLE buildpulse_billing_invoices IS
'BuildPulse advertising invoices issued by TVK LABS & TECHNOLOGIES LTD. Payment confirmation never bypasses creative/editorial review.';
