ALTER TABLE buildpulse_editions ADD COLUMN IF NOT EXISTS generation_started_at TIMESTAMPTZ;
ALTER TABLE buildpulse_editions ADD COLUMN IF NOT EXISTS generation_completed_at TIMESTAMPTZ;
ALTER TABLE buildpulse_editions ADD COLUMN IF NOT EXISTS generation_error TEXT;

CREATE OR REPLACE FUNCTION buildpulse_claim_edition_generation(
  p_generation_key TEXT,
  p_edition_type TEXT,
  p_locale TEXT,
  p_subject TEXT,
  p_preheader TEXT,
  p_slug TEXT,
  p_metadata JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path=public
AS $$
DECLARE eid UUID;
BEGIN
  INSERT INTO buildpulse_editions(
    edition_type,locale,subject,preheader,slug,generation_key,status,
    generation_metadata,generation_started_at,generation_completed_at,
    generation_error,updated_at
  )
  VALUES(
    p_edition_type,p_locale,p_subject,p_preheader,p_slug,p_generation_key,
    'draft',p_metadata,NOW(),NULL,NULL,NOW()
  )
  ON CONFLICT(generation_key) DO NOTHING
  RETURNING id INTO eid;

  IF eid IS NOT NULL THEN RETURN eid; END IF;

  UPDATE buildpulse_editions
  SET generation_started_at=NOW(),generation_error=NULL,updated_at=NOW()
  WHERE generation_key=p_generation_key
    AND generation_completed_at IS NULL
    AND (generation_started_at IS NULL OR generation_started_at<NOW()-INTERVAL '15 minutes')
  RETURNING id INTO eid;

  RETURN eid;
END
$$;

REVOKE ALL ON FUNCTION buildpulse_claim_edition_generation(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION buildpulse_claim_edition_generation(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) TO service_role;
