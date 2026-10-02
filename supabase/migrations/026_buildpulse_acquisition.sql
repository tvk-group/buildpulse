-- BuildPulse acquisition attribution and consent audit.
ALTER TABLE buildpulse_subscribers ADD COLUMN IF NOT EXISTS acquisition_surface TEXT;
ALTER TABLE buildpulse_subscribers ADD COLUMN IF NOT EXISTS acquisition_product TEXT;
ALTER TABLE buildpulse_subscribers ADD COLUMN IF NOT EXISTS acquisition_path TEXT;
ALTER TABLE buildpulse_subscribers ADD COLUMN IF NOT EXISTS acquisition_utm JSONB NOT NULL DEFAULT '{}'::JSONB;

CREATE TABLE IF NOT EXISTS buildpulse_consent_events (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 subscriber_id UUID REFERENCES buildpulse_subscribers(id) ON DELETE SET NULL,
 email_hash TEXT NOT NULL,
 action TEXT NOT NULL CHECK(action IN ('invite_shown','invite_dismissed','subscribe','preferences_changed','unsubscribe','suppressed')),
 surface TEXT,
 product TEXT,
 path TEXT,
 metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_buildpulse_consent_events_time ON buildpulse_consent_events(created_at DESC);
ALTER TABLE buildpulse_consent_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS buildpulse_consent_events_service_all ON buildpulse_consent_events;
CREATE POLICY buildpulse_consent_events_service_all ON buildpulse_consent_events FOR ALL TO service_role USING(true) WITH CHECK(true);
DROP POLICY IF EXISTS buildpulse_consent_events_deny_clients ON buildpulse_consent_events;
CREATE POLICY buildpulse_consent_events_deny_clients ON buildpulse_consent_events FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
GRANT ALL ON TABLE buildpulse_consent_events TO postgres,service_role;
