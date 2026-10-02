ALTER TABLE buildpulse_stories ADD COLUMN IF NOT EXISTS verification_notes TEXT, ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS verified_by TEXT, ADD COLUMN IF NOT EXISTS corroboration_count INTEGER NOT NULL DEFAULT 0 CHECK(corroboration_count>=0), ADD COLUMN IF NOT EXISTS canonical_source_url TEXT;
CREATE INDEX IF NOT EXISTS idx_buildpulse_stories_verification_queue ON buildpulse_stories(verification_state,editorial_score DESC,published_at DESC);
CREATE TABLE IF NOT EXISTS buildpulse_story_evidence(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),story_id UUID NOT NULL REFERENCES buildpulse_stories(id) ON DELETE CASCADE,source_url TEXT NOT NULL,source_name TEXT,source_kind TEXT NOT NULL DEFAULT 'supporting' CHECK(source_kind IN('primary','supporting','contradicting')),notes TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(story_id,source_url));
ALTER TABLE buildpulse_story_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY buildpulse_story_evidence_service_all ON buildpulse_story_evidence FOR ALL TO service_role USING(true) WITH CHECK(true);
GRANT ALL ON buildpulse_story_evidence TO service_role;
