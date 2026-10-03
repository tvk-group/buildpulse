-- Technology editorial publication gate and scheduler.
CREATE OR REPLACE FUNCTION public.buildpulse_publish_technology_article(p_article_id UUID,p_reviewer TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.buildpulse_technology_articles%ROWTYPE; sid UUID; s RECORD;
BEGIN
 IF coalesce(trim(p_reviewer),'')='' THEN RAISE EXCEPTION 'reviewer required'; END IF;
 SELECT * INTO a FROM public.buildpulse_technology_articles WHERE id=p_article_id FOR UPDATE;
 IF a.id IS NULL THEN RETURN FALSE; END IF;
 IF a.status<>'review' THEN RAISE EXCEPTION 'article is not awaiting review'; END IF;
 IF cardinality(a.source_story_ids)=0 OR cardinality(a.source_urls)=0 THEN RAISE EXCEPTION 'source provenance required'; END IF;
 FOREACH sid IN ARRAY a.source_story_ids LOOP
   SELECT verification_state,verified_at,verified_by,canonical_source_url INTO s FROM public.buildpulse_stories WHERE id=sid;
   IF s.verification_state IS DISTINCT FROM 'verified' OR s.verified_at IS NULL OR s.verified_by IS NULL OR coalesce(s.canonical_source_url,'')='' THEN RAISE EXCEPTION 'all source stories must remain verified'; END IF;
 END LOOP;
 UPDATE public.buildpulse_technology_articles SET status='published',reviewed_at=now(),reviewed_by=lower(trim(p_reviewer)),published_at=now(),updated_at=now() WHERE id=p_article_id;
 RETURN TRUE;
END $$;
REVOKE ALL ON FUNCTION public.buildpulse_publish_technology_article(UUID,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.buildpulse_publish_technology_article(UUID,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.buildpulse_reject_technology_article(p_article_id UUID,p_reviewer TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'service role required'; END IF;
 IF coalesce(trim(p_reviewer),'')='' THEN RAISE EXCEPTION 'reviewer required'; END IF;
 UPDATE public.buildpulse_technology_articles SET status='rejected',reviewed_at=now(),reviewed_by=lower(trim(p_reviewer)),updated_at=now() WHERE id=p_article_id AND status='review';
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.buildpulse_reject_technology_article(UUID,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.buildpulse_reject_technology_article(UUID,TEXT) TO service_role;
