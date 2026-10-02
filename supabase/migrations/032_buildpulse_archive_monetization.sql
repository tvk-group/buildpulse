-- BuildPulse public archive, PDF artifacts and transparent monetization.
ALTER TABLE buildpulse_editions
 ADD COLUMN IF NOT EXISTS public_excerpt TEXT,
 ADD COLUMN IF NOT EXISTS pdf_path TEXT,
 ADD COLUMN IF NOT EXISTS pdf_sha256 TEXT,
 ADD COLUMN IF NOT EXISTS archive_visible BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS seo_title TEXT,
 ADD COLUMN IF NOT EXISTS seo_description TEXT;
CREATE INDEX IF NOT EXISTS idx_buildpulse_public_archive ON buildpulse_editions(published_at DESC) WHERE archive_visible=true AND status='sent';

CREATE TABLE IF NOT EXISTS buildpulse_sponsors (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT NOT NULL, destination_url TEXT NOT NULL,
 disclosure_label TEXT NOT NULL DEFAULT 'Advertisement', active BOOLEAN NOT NULL DEFAULT false,
 starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS buildpulse_affiliate_links (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), label TEXT NOT NULL, destination_url TEXT NOT NULL,
 disclosure TEXT NOT NULL DEFAULT 'Affiliate link', active BOOLEAN NOT NULL DEFAULT false,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE buildpulse_sponsors ENABLE ROW LEVEL SECURITY;ALTER TABLE buildpulse_affiliate_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY buildpulse_sponsors_service_all ON buildpulse_sponsors FOR ALL TO service_role USING(true) WITH CHECK(true);
CREATE POLICY buildpulse_sponsors_deny_clients ON buildpulse_sponsors FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
CREATE POLICY buildpulse_affiliate_links_service_all ON buildpulse_affiliate_links FOR ALL TO service_role USING(true) WITH CHECK(true);
CREATE POLICY buildpulse_affiliate_links_deny_clients ON buildpulse_affiliate_links FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
GRANT ALL ON TABLE buildpulse_sponsors,buildpulse_affiliate_links TO postgres,service_role;
