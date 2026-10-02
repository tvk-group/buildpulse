CREATE TABLE IF NOT EXISTS buildpulse_source_items (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 source_id UUID NOT NULL REFERENCES buildpulse_sources(id) ON DELETE CASCADE,
 external_id TEXT,
 url TEXT NOT NULL,
 title TEXT NOT NULL,
 excerpt TEXT,
 published_at TIMESTAMPTZ,
 raw JSONB NOT NULL DEFAULT '{}'::JSONB,
 fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(source_id,url)
);
CREATE INDEX IF NOT EXISTS idx_buildpulse_source_items_queue ON buildpulse_source_items(source_id,published_at DESC);
ALTER TABLE buildpulse_source_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS buildpulse_source_items_service_all ON buildpulse_source_items;
CREATE POLICY buildpulse_source_items_service_all ON buildpulse_source_items FOR ALL TO service_role USING(true) WITH CHECK(true);
DROP POLICY IF EXISTS buildpulse_source_items_deny_clients ON buildpulse_source_items;
CREATE POLICY buildpulse_source_items_deny_clients ON buildpulse_source_items FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
GRANT ALL ON TABLE buildpulse_source_items TO postgres,service_role;
