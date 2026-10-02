CREATE OR REPLACE FUNCTION public.buildpulse_claim_edition_generation(
  p_generation_key text,
  p_edition_type text,
  p_locale text,
  p_subject text,
  p_preheader text,
  p_slug text,
  p_metadata jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  eid uuid;
  existing public.buildpulse_editions%ROWTYPE;
BEGIN
  INSERT INTO public.buildpulse_editions(
    edition_type,locale,subject,preheader,slug,generation_key,status,generation_metadata,
    generation_started_at,generation_completed_at,generation_error,updated_at
  ) VALUES (
    p_edition_type,p_locale,p_subject,p_preheader,p_slug,p_generation_key,'draft',p_metadata,
    now(),null,null,now()
  )
  ON CONFLICT (generation_key) DO NOTHING
  RETURNING id INTO eid;

  IF eid IS NOT NULL THEN RETURN eid; END IF;

  SELECT * INTO existing FROM public.buildpulse_editions
  WHERE generation_key=p_generation_key FOR UPDATE;

  IF NOT FOUND OR existing.generation_completed_at IS NOT NULL THEN RETURN NULL; END IF;
  IF existing.generation_started_at IS NOT NULL
     AND existing.generation_started_at >= now()-interval '15 minutes' THEN RETURN NULL; END IF;

  UPDATE public.buildpulse_editions
  SET generation_started_at=now(),generation_error=null,generation_metadata=p_metadata,updated_at=now()
  WHERE id=existing.id RETURNING id INTO eid;
  RETURN eid;
END
$$;

REVOKE ALL ON FUNCTION public.buildpulse_claim_edition_generation(text,text,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buildpulse_claim_edition_generation(text,text,text,text,text,text,jsonb) TO service_role;
