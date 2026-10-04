-- Persist the corrected pre-provider dispatch state as a forward migration.
-- Claiming an edition is not equivalent to creating a Brevo campaign.
CREATE OR REPLACE FUNCTION public.buildpulse_claim_dispatch(p_edition_id UUID,p_revision INTEGER,p_token UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.buildpulse_editions
 SET dispatch_claim_token=p_token,
     dispatch_claimed_at=NOW(),
     brevo_dispatch_state='claimed',
     brevo_dispatch_error=NULL,
     updated_at=NOW()
 WHERE id=p_edition_id
   AND revision_number=p_revision
   AND founder_review_status='approved'
   AND founder_approved_revision=p_revision
   AND status IN ('approved','scheduled')
   AND brevo_campaign_id IS NULL
   AND dispatch_claim_token IS NULL;
 RETURN FOUND;
END $$;

REVOKE ALL ON FUNCTION public.buildpulse_claim_dispatch(UUID,INTEGER,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.buildpulse_claim_dispatch(UUID,INTEGER,UUID) TO service_role;
