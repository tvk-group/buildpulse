ALTER TABLE public.buildpulse_editions
  DROP CONSTRAINT IF EXISTS buildpulse_editions_status_check;

ALTER TABLE public.buildpulse_editions
  ADD CONSTRAINT buildpulse_editions_status_check
  CHECK (status IN ('draft','review','approved','scheduled','published','sending','sent','failed'));

CREATE OR REPLACE FUNCTION public.buildpulse_lock_sent_edition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path=public
AS $$
BEGIN
  IF OLD.status IN ('published','sending','sent') THEN
    IF NEW.subject IS DISTINCT FROM OLD.subject
       OR NEW.preheader IS DISTINCT FROM OLD.preheader
       OR NEW.body_html IS DISTINCT FROM OLD.body_html
       OR NEW.body_text IS DISTINCT FROM OLD.body_text
       OR NEW.slug IS DISTINCT FROM OLD.slug
       OR NEW.revision_number IS DISTINCT FROM OLD.revision_number
       OR NEW.pdf_path IS DISTINCT FROM OLD.pdf_path
       OR NEW.pdf_sha256 IS DISTINCT FROM OLD.pdf_sha256
       OR NEW.pdf_revision IS DISTINCT FROM OLD.pdf_revision THEN
      RAISE EXCEPTION 'published BuildPulse edition content and artifacts are immutable; use the correction workflow';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.buildpulse_publish_web_editions()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE n INTEGER:=0;
BEGIN
  UPDATE public.buildpulse_editions
  SET status='published',
      archive_visible=TRUE,
      published_at=COALESCE(published_at,NOW()),
      public_excerpt=COALESCE(NULLIF(public_excerpt,''),preheader),
      seo_title=COALESCE(NULLIF(seo_title,''),subject),
      seo_description=COALESCE(NULLIF(seo_description,''),public_excerpt,preheader),
      updated_at=NOW()
  WHERE status='scheduled'
    AND scheduled_at<=NOW()
    AND body_html IS NOT NULL
    AND founder_review_status='approved'
    AND founder_approved_revision=revision_number;
  GET DIAGNOSTICS n=ROW_COUNT;
  RETURN jsonb_build_object('ok',true,'published',n,'ranAt',NOW());
END $$;

REVOKE ALL ON FUNCTION public.buildpulse_publish_web_editions() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.buildpulse_publish_web_editions() TO service_role;

DO $$
DECLARE existing_job BIGINT;
BEGIN
  SELECT jobid INTO existing_job FROM cron.job WHERE jobname='buildpulse-web-publication-db' LIMIT 1;
  IF existing_job IS NOT NULL THEN PERFORM cron.unschedule(existing_job); END IF;
END $$;

SELECT cron.schedule(
  'buildpulse-web-publication-db',
  '*/5 * * * *',
  $$SELECT public.buildpulse_publish_web_editions();$$
);
