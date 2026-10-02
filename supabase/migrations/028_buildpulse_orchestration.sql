ALTER TABLE buildpulse_sources ADD COLUMN IF NOT EXISTS feed_url TEXT;
ALTER TABLE buildpulse_sources ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE buildpulse_sources ADD COLUMN IF NOT EXISTS last_fetched_at TIMESTAMPTZ;
ALTER TABLE buildpulse_sources ADD COLUMN IF NOT EXISTS last_fetch_status TEXT;
ALTER TABLE buildpulse_sources ADD COLUMN IF NOT EXISTS last_fetch_error TEXT;
ALTER TABLE buildpulse_sources ADD COLUMN IF NOT EXISTS fetch_interval_minutes INTEGER NOT NULL DEFAULT 60 CHECK(fetch_interval_minutes BETWEEN 15 AND 10080);
CREATE INDEX IF NOT EXISTS idx_buildpulse_sources_due ON buildpulse_sources(enabled,last_fetched_at);

ALTER TABLE buildpulse_editions ADD COLUMN IF NOT EXISTS generation_metadata JSONB NOT NULL DEFAULT '{}'::JSONB;
ALTER TABLE buildpulse_editions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE buildpulse_editions ADD COLUMN IF NOT EXISTS approved_by TEXT;
