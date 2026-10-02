CREATE OR REPLACE FUNCTION buildpulse_lock_sent_edition() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF OLD.status='sent' THEN IF NEW.subject IS DISTINCT FROM OLD.subject OR NEW.preheader IS DISTINCT FROM OLD.preheader OR NEW.body_html IS DISTINCT FROM OLD.body_html OR NEW.body_text IS DISTINCT FROM OLD.body_text OR NEW.slug IS DISTINCT FROM OLD.slug OR NEW.revision_number IS DISTINCT FROM OLD.revision_number OR NEW.pdf_path IS DISTINCT FROM OLD.pdf_path OR NEW.pdf_sha256 IS DISTINCT FROM OLD.pdf_sha256 OR NEW.pdf_revision IS DISTINCT FROM OLD.pdf_revision THEN RAISE EXCEPTION 'sent BuildPulse edition content and artifact are immutable'; END IF; END IF; RETURN NEW; END $$;
ALTER FUNCTION buildpulse_search_editions(TEXT,TEXT,INTEGER,INTEGER) SECURITY INVOKER SET search_path=public;
ALTER FUNCTION buildpulse_verify_story(UUID,TEXT,TEXT,TEXT,TEXT[]) SECURITY INVOKER;
ALTER FUNCTION buildpulse_reject_story(UUID,TEXT,TEXT) SECURITY INVOKER;
ALTER FUNCTION buildpulse_founder_approve(UUID,INTEGER,TEXT) SECURITY INVOKER;
ALTER FUNCTION buildpulse_founder_request_changes(UUID,INTEGER,TEXT,TEXT) SECURITY INVOKER;
ALTER FUNCTION buildpulse_claim_dispatch(UUID,INTEGER,UUID) SECURITY INVOKER;
ALTER FUNCTION buildpulse_release_dispatch_claim(UUID,UUID,TEXT) SECURITY INVOKER;
ALTER FUNCTION buildpulse_schedule_ad_order(UUID,TIMESTAMPTZ,TIMESTAMPTZ) SECURITY INVOKER;
