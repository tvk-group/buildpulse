-- Autonomous technology editorial agent: drafts are AI-assisted; factual publication stays provenance-gated.
CREATE TABLE IF NOT EXISTS public.buildpulse_technology_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  topic TEXT NOT NULL CHECK (topic IN ('tvk-ecosystem','entelekron','sovereign-ai','energiemind','presale-technology')),
  title TEXT NOT NULL,
  dek TEXT,
  body_markdown TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published','rejected')),
  source_story_ids UUID[] NOT NULL DEFAULT '{}'::UUID[],
  source_urls TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  provider TEXT,
  model TEXT,
  generation_key TEXT NOT NULL UNIQUE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bp_technology_articles_public ON public.buildpulse_technology_articles(status,published_at DESC);
ALTER TABLE public.buildpulse_technology_articles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.buildpulse_technology_articles FROM anon,authenticated;
GRANT ALL ON public.buildpulse_technology_articles TO service_role;

INSERT INTO public.buildpulse_agents(code,name,domain,autonomy_level,description,allowed_actions,blocked_actions,schedule_hint,config)
VALUES(
 'technology-editorial','Technology Editorial Agent','editorial','draft',
 'Continuously prepares source-grounded technology features covering the TVK ecosystem, ENTELΞKRON, Sovereign AI, EnergieMIND and presale technology.',
 ARRAY['select_verified_sources','draft_article','deduplicate','prepare_seo','request_review'],
 ARRAY['invent_fact','claim_unverified_audit','claim_unverified_partnership','publish_unverified','change_presale_terms'],
 'every 6 hours',
 '{"topics":["tvk-ecosystem","entelekron","sovereign-ai","energiemind","presale-technology"]}'::jsonb
)
ON CONFLICT(code) DO UPDATE SET
 name=excluded.name,domain=excluded.domain,autonomy_level=excluded.autonomy_level,description=excluded.description,
 allowed_actions=excluded.allowed_actions,blocked_actions=excluded.blocked_actions,schedule_hint=excluded.schedule_hint,config=excluded.config,updated_at=now();
