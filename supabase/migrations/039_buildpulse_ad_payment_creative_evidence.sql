-- BuildPulse immutable advertiser payment evidence and creative review records.
CREATE TABLE IF NOT EXISTS buildpulse_ad_payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES buildpulse_ad_orders(id) ON DELETE RESTRICT,
  provider_event_key TEXT NOT NULL UNIQUE,
  crypto_asset TEXT NOT NULL,
  crypto_network TEXT NOT NULL,
  tx_hash TEXT,
  observed_amount NUMERIC(38,18),
  confirmations INTEGER NOT NULL DEFAULT 0 CHECK (confirmations >= 0),
  state TEXT NOT NULL CHECK (state IN ('observed','confirmed','rejected','reorged')),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_buildpulse_ad_payment_events_order_time ON buildpulse_ad_payment_events(order_id,observed_at DESC);

CREATE TABLE IF NOT EXISTS buildpulse_ad_creatives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES buildpulse_ad_orders(id) ON DELETE RESTRICT,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size > 0),
  width_px INTEGER,
  height_px INTEGER,
  sha256 TEXT NOT NULL,
  review_state TEXT NOT NULL DEFAULT 'pending' CHECK (review_state IN ('pending','approved','rejected')),
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_buildpulse_ad_creatives_order_sha ON buildpulse_ad_creatives(order_id,sha256);

ALTER TABLE buildpulse_ad_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildpulse_ad_creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY buildpulse_ad_payment_events_own_read ON buildpulse_ad_payment_events
 FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM buildpulse_ad_orders o WHERE o.id=order_id AND o.user_id=auth.uid()));
CREATE POLICY buildpulse_ad_payment_events_service_all ON buildpulse_ad_payment_events
 FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY buildpulse_ad_creatives_own_read ON buildpulse_ad_creatives
 FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM buildpulse_ad_orders o WHERE o.id=order_id AND o.user_id=auth.uid()));
CREATE POLICY buildpulse_ad_creatives_service_all ON buildpulse_ad_creatives
 FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT ON buildpulse_ad_payment_events,buildpulse_ad_creatives TO authenticated;
GRANT ALL ON buildpulse_ad_payment_events,buildpulse_ad_creatives TO service_role;
