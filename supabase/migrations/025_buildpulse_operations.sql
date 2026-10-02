-- BuildPulse operational hardening: ingestion runs, idempotency and review provenance.
ALTER TABLE buildpulse_stories ADD COLUMN IF NOT EXISTS normalized_title TEXT;
ALTER TABLE buildpulse_stories ADD COLUMN IF NOT EXISTS corroboration_count INTEGER NOT NULL DEFAULT 0 CHECK (corroboration_count >= 0);
ALTER TABLE buildpulse_stories ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE buildpulse_stories ADD COLUMN IF NOT EXISTS verified_by TEXT;
CREATE INDEX IF NOT EXISTS idx_buildpulse_stories_hash ON buildpulse_stories(content_hash) WHERE content_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS buildpulse_ingestion_runs (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 run_key TEXT NOT NULL UNIQUE,
 status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running','completed','failed')),
 discovered_count INTEGER NOT NULL DEFAULT 0,
 accepted_count INTEGER NOT NULL DEFAULT 0,
 rejected_count INTEGER NOT NULL DEFAULT 0,
 started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 completed_at TIMESTAMPTZ,
 error_summary TEXT
);
ALTER TABLE buildpulse_ingestion_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS buildpulse_ingestion_runs_service_all ON buildpulse_ingestion_runs;
CREATE POLICY buildpulse_ingestion_runs_service_all ON buildpulse_ingestion_runs FOR ALL TO service_role USING(true) WITH CHECK(true);
DROP POLICY IF EXISTS buildpulse_ingestion_runs_deny_clients ON buildpulse_ingestion_runs;
CREATE POLICY buildpulse_ingestion_runs_deny_clients ON buildpulse_ingestion_runs FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
GRANT ALL ON TABLE buildpulse_ingestion_runs TO postgres,service_role;

CREATE TABLE IF NOT EXISTS buildpulse_review_events (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 edition_id UUID REFERENCES buildpulse_editions(id) ON DELETE CASCADE,
 story_id UUID REFERENCES buildpulse_stories(id) ON DELETE CASCADE,
 action TEXT NOT NULL CHECK(action IN ('verify','reject','request_changes','approve_edition','schedule','cancel','founder_changes_requested')),
 actor TEXT NOT NULL,
 notes TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK (edition_id IS NOT NULL OR story_id IS NOT NULL)
);
ALTER TABLE buildpulse_review_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS buildpulse_review_events_service_all ON buildpulse_review_events;
CREATE POLICY buildpulse_review_events_service_all ON buildpulse_review_events FOR ALL TO service_role USING(true) WITH CHECK(true);
DROP POLICY IF EXISTS buildpulse_review_events_deny_clients ON buildpulse_review_events;
CREATE POLICY buildpulse_review_events_deny_clients ON buildpulse_review_events FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
GRANT ALL ON TABLE buildpulse_review_events TO postgres,service_role;
