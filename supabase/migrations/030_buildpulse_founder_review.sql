ALTER TABLE buildpulse_editions ADD COLUMN IF NOT EXISTS founder_review_status TEXT NOT NULL DEFAULT 'pending' CHECK(founder_review_status IN ('pending','sent','changes_requested','approved'));
ALTER TABLE buildpulse_editions ADD COLUMN IF NOT EXISTS founder_review_sent_at TIMESTAMPTZ;
ALTER TABLE buildpulse_editions ADD COLUMN IF NOT EXISTS founder_reviewed_at TIMESTAMPTZ;
ALTER TABLE buildpulse_editions ADD COLUMN IF NOT EXISTS founder_review_notes TEXT;
ALTER TABLE buildpulse_editions ADD COLUMN IF NOT EXISTS revision_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE buildpulse_editions ADD COLUMN IF NOT EXISTS founder_approved_revision INTEGER;
