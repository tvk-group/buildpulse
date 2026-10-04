-- Atomic dispatch claim before any external Brevo side effect.
ALTER TABLE buildpulse_editions ADD COLUMN IF NOT EXISTS dispatch_claim_token UUID;
ALTER TABLE buildpulse_editions ADD COLUMN IF NOT EXISTS dispatch_claimed_at TIMESTAMPTZ;
CREATE OR REPLACE FUNCTION buildpulse_claim_dispatch(p_edition_id UUID,p_revision INTEGER,p_token UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE buildpulse_editions SET dispatch_claim_token=p_token,dispatch_claimed_at=NOW(),brevo_dispatch_state='claimed',brevo_dispatch_error=NULL,updated_at=NOW()
 WHERE id=p_edition_id AND revision_number=p_revision AND founder_review_status='approved' AND founder_approved_revision=p_revision AND status IN ('approved','scheduled') AND brevo_campaign_id IS NULL AND dispatch_claim_token IS NULL;
 RETURN FOUND;
END $$;
CREATE OR REPLACE FUNCTION buildpulse_release_dispatch_claim(p_edition_id UUID,p_token UUID,p_error TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE buildpulse_editions SET dispatch_claim_token=NULL,dispatch_claimed_at=NULL,brevo_dispatch_state='failed',brevo_dispatch_error=left(p_error,1000),updated_at=NOW()
 WHERE id=p_edition_id AND dispatch_claim_token=p_token AND brevo_campaign_id IS NULL;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION buildpulse_claim_dispatch(UUID,INTEGER,UUID) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION buildpulse_release_dispatch_claim(UUID,UUID,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION buildpulse_claim_dispatch(UUID,INTEGER,UUID) TO service_role;
GRANT EXECUTE ON FUNCTION buildpulse_release_dispatch_claim(UUID,UUID,TEXT) TO service_role;
