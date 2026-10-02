-- BuildPulse ad inventory calendar, creative approval and verified analytics.
CREATE TABLE IF NOT EXISTS buildpulse_ad_slots (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), product_id UUID NOT NULL REFERENCES buildpulse_ad_products(id) ON DELETE CASCADE,
 slot_date DATE NOT NULL, capacity INTEGER NOT NULL DEFAULT 1 CHECK(capacity>0), active BOOLEAN NOT NULL DEFAULT true,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(product_id,slot_date)
);
CREATE TABLE IF NOT EXISTS buildpulse_ad_events (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), order_id UUID NOT NULL REFERENCES buildpulse_ad_orders(id) ON DELETE CASCADE,
 event_type TEXT NOT NULL CHECK(event_type IN ('impression','click')), event_key TEXT NOT NULL UNIQUE,
 is_verified BOOLEAN NOT NULL DEFAULT false, rejection_reason TEXT, occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 metadata JSONB NOT NULL DEFAULT '{}'::JSONB
);
CREATE INDEX IF NOT EXISTS idx_buildpulse_ad_events_order ON buildpulse_ad_events(order_id,event_type,occurred_at DESC);
ALTER TABLE buildpulse_ad_slots ENABLE ROW LEVEL SECURITY;ALTER TABLE buildpulse_ad_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY buildpulse_ad_slots_public_read ON buildpulse_ad_slots FOR SELECT TO anon,authenticated USING(active=true);
CREATE POLICY buildpulse_ad_slots_service_all ON buildpulse_ad_slots FOR ALL TO service_role USING(true) WITH CHECK(true);
CREATE POLICY buildpulse_ad_events_service_all ON buildpulse_ad_events FOR ALL TO service_role USING(true) WITH CHECK(true);
CREATE POLICY buildpulse_ad_events_own_read ON buildpulse_ad_events FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM buildpulse_ad_orders o WHERE o.id=order_id AND o.user_id=auth.uid()));
GRANT SELECT ON buildpulse_ad_slots TO anon,authenticated;GRANT SELECT ON buildpulse_ad_events TO authenticated;GRANT ALL ON buildpulse_ad_slots,buildpulse_ad_events TO service_role;
