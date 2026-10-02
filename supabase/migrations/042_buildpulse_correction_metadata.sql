ALTER TABLE buildpulse_editions
 ADD COLUMN IF NOT EXISTS correction_note TEXT,
 ADD COLUMN IF NOT EXISTS corrected_at TIMESTAMPTZ,
 ADD COLUMN IF NOT EXISTS original_published_at TIMESTAMPTZ;
COMMENT ON COLUMN buildpulse_editions.correction_note IS 'Public explanation of a material correction; historical sent artifacts remain immutable.';
COMMENT ON COLUMN buildpulse_editions.original_published_at IS 'Original publication timestamp retained when a corrected web representation is issued.';
