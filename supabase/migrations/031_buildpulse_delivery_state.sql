-- BuildPulse campaign dispatch state for crash-safe reconciliation.
ALTER TABLE buildpulse_editions
 ADD COLUMN IF NOT EXISTS brevo_dispatch_state TEXT NOT NULL DEFAULT 'none'
 CHECK (brevo_dispatch_state IN ('none','campaign_created','send_requested','scheduled','sent','failed')),
 ADD COLUMN IF NOT EXISTS brevo_dispatch_error TEXT,
 ADD COLUMN IF NOT EXISTS brevo_campaign_created_at TIMESTAMPTZ,
 ADD COLUMN IF NOT EXISTS brevo_send_requested_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_buildpulse_editions_dispatch_state ON buildpulse_editions(brevo_dispatch_state);
