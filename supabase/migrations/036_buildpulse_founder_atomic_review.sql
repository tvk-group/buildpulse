-- Atomic founder review transitions: exact revision + state mutation + audit event in one transaction.
CREATE OR REPLACE FUNCTION buildpulse_founder_approve(p_edition_id UUID,p_revision INTEGER,p_actor TEXT DEFAULT 'founder@tvk.group')
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE buildpulse_editions SET founder_review_status='approved',founder_approved_revision=p_revision,approved_at=NOW(),approved_by=p_actor,status='approved',updated_at=NOW()
 WHERE id=p_edition_id AND revision_number=p_revision AND status='review' AND founder_review_status IN ('pending','sent');
 IF NOT FOUND THEN RETURN false; END IF;
 INSERT INTO buildpulse_review_events(edition_id,action,actor,notes) VALUES(p_edition_id,'approve_edition',p_actor,'Founder approved exact revision '||p_revision);
 RETURN true;
END $$;
CREATE OR REPLACE FUNCTION buildpulse_founder_request_changes(p_edition_id UUID,p_revision INTEGER,p_notes TEXT,p_actor TEXT DEFAULT 'founder@tvk.group')
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF length(trim(coalesce(p_notes,'')))<2 THEN RETURN false; END IF;
 UPDATE buildpulse_editions SET founder_review_status='changes_requested',founder_review_notes=p_notes,status='review',updated_at=NOW()
 WHERE id=p_edition_id AND revision_number=p_revision AND status='review' AND founder_review_status IN ('pending','sent');
 IF NOT FOUND THEN RETURN false; END IF;
 INSERT INTO buildpulse_review_events(edition_id,action,actor,notes) VALUES(p_edition_id,'founder_changes_requested',p_actor,p_notes);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION buildpulse_founder_approve(UUID,INTEGER,TEXT) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION buildpulse_founder_request_changes(UUID,INTEGER,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION buildpulse_founder_approve(UUID,INTEGER,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION buildpulse_founder_request_changes(UUID,INTEGER,TEXT,TEXT) TO service_role;
