CREATE TABLE IF NOT EXISTS buildpulse_ad_payment_quotes(
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 order_id UUID NOT NULL REFERENCES buildpulse_ad_orders(id) ON DELETE RESTRICT,
 asset TEXT NOT NULL,
 network TEXT NOT NULL,
 expected_amount NUMERIC(38,18) NOT NULL CHECK(expected_amount>0),
 destination TEXT NOT NULL,
 memo TEXT,
 usd_amount NUMERIC(12,2) NOT NULL CHECK(usd_amount>0),
 rate_usd NUMERIC(38,18) NOT NULL CHECK(rate_usd>0),
 quoted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 expires_at TIMESTAMPTZ NOT NULL,
 state TEXT NOT NULL DEFAULT 'open' CHECK(state IN('open','expired','observed','confirmed','cancelled')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK(expires_at>quoted_at)
);
CREATE INDEX IF NOT EXISTS idx_buildpulse_ad_payment_quotes_order ON buildpulse_ad_payment_quotes(order_id,created_at DESC);
ALTER TABLE buildpulse_ad_payment_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY buildpulse_ad_payment_quotes_own_read ON buildpulse_ad_payment_quotes FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM buildpulse_ad_orders o WHERE o.id=order_id AND o.user_id=(select auth.uid())));
CREATE POLICY buildpulse_ad_payment_quotes_service_all ON buildpulse_ad_payment_quotes FOR ALL TO service_role USING(true) WITH CHECK(true);
GRANT SELECT ON buildpulse_ad_payment_quotes TO authenticated;
GRANT ALL ON buildpulse_ad_payment_quotes TO service_role;
COMMENT ON TABLE buildpulse_ad_payment_quotes IS 'Server-issued crypto advertising payment quotes. A confirmed payment advances an order to review, never directly to active.';
