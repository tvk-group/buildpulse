-- BuildPulse global intelligence publication core
-- Supabase is canonical; Brevo is delivery. Client roles are denied by RLS.

CREATE TABLE IF NOT EXISTS buildpulse_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  cadence TEXT NOT NULL DEFAULT 'weekly' CHECK (cadence IN ('daily','weekly','both')),
  topics TEXT[] NOT NULL DEFAULT ARRAY['ai','blockchain','crypto','security','digital-economy','entelekron']::TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','unsubscribed','suppressed')),
  consent_basis TEXT NOT NULL CHECK (consent_basis IN ('explicit','soft_opt_in','manual_verified')),
  consent_source TEXT NOT NULL,
  consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  brevo_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_buildpulse_subscribers_email ON buildpulse_subscribers(lower(email));
CREATE INDEX IF NOT EXISTS idx_buildpulse_subscribers_delivery ON buildpulse_subscribers(status,cadence,locale);

CREATE TABLE IF NOT EXISTS buildpulse_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'publication' CHECK (source_type IN ('official','regulator','publication','research','market-data','internal')),
  trust_tier SMALLINT NOT NULL DEFAULT 3 CHECK (trust_tier BETWEEN 1 AND 5),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_buildpulse_sources_url ON buildpulse_sources(base_url);

CREATE TABLE IF NOT EXISTS buildpulse_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canonical_url TEXT NOT NULL,
  source_id UUID REFERENCES buildpulse_sources(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT,
  category TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  content_hash TEXT,
  verification_state TEXT NOT NULL DEFAULT 'pending' CHECK (verification_state IN ('pending','verified','rejected','needs_review')),
  editorial_score NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_buildpulse_stories_url ON buildpulse_stories(canonical_url);
CREATE INDEX IF NOT EXISTS idx_buildpulse_stories_queue ON buildpulse_stories(verification_state,category,published_at DESC);

CREATE TABLE IF NOT EXISTS buildpulse_editions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edition_type TEXT NOT NULL CHECK (edition_type IN ('daily','weekly','research','alert')),
  locale TEXT NOT NULL DEFAULT 'en',
  issue_number BIGINT,
  subject TEXT NOT NULL,
  preheader TEXT,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','approved','scheduled','sending','sent','failed')),
  body_html TEXT,
  body_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  brevo_campaign_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(edition_type,locale,slug)
);
CREATE INDEX IF NOT EXISTS idx_buildpulse_editions_schedule ON buildpulse_editions(status,scheduled_at);

CREATE TABLE IF NOT EXISTS buildpulse_edition_stories (
  edition_id UUID NOT NULL REFERENCES buildpulse_editions(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES buildpulse_stories(id) ON DELETE RESTRICT,
  section TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(edition_id,story_id)
);

CREATE TABLE IF NOT EXISTS buildpulse_delivery_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edition_id UUID REFERENCES buildpulse_editions(id) ON DELETE SET NULL,
  subscriber_id UUID REFERENCES buildpulse_subscribers(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'brevo' CHECK (provider = 'brevo'),
  event_type TEXT NOT NULL,
  provider_message_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_buildpulse_delivery_events_edition ON buildpulse_delivery_events(edition_id,occurred_at DESC);

ALTER TABLE buildpulse_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildpulse_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildpulse_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildpulse_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildpulse_edition_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildpulse_delivery_events ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['buildpulse_subscribers','buildpulse_sources','buildpulse_stories','buildpulse_editions','buildpulse_edition_stories','buildpulse_delivery_events']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_service_all', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t || '_service_all', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_deny_clients', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)', t || '_deny_clients', t);
  END LOOP;
END $$;

GRANT ALL ON TABLE buildpulse_subscribers, buildpulse_sources, buildpulse_stories, buildpulse_editions, buildpulse_edition_stories, buildpulse_delivery_events TO postgres, service_role;
