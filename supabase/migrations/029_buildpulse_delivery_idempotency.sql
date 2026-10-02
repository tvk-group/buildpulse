ALTER TABLE buildpulse_delivery_events ADD COLUMN IF NOT EXISTS event_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_buildpulse_delivery_event_key ON buildpulse_delivery_events(event_key) WHERE event_key IS NOT NULL;
ALTER TABLE buildpulse_delivery_events ADD COLUMN IF NOT EXISTS edition_id UUID REFERENCES buildpulse_editions(id) ON DELETE SET NULL;
