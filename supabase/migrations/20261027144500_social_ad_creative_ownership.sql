-- A creative may only be edited while its campaign remains owned by the caller.
-- Both the original and replacement row are checked. Never let browser clients
-- move campaigns or forge moderation/creation metadata.
ALTER POLICY bp_social_ad_creatives_owner_update
ON public.buildpulse_social_ad_creatives TO authenticated
USING (
 moderation_status = 'pending'
 AND EXISTS (
  SELECT 1 FROM public.buildpulse_social_ad_campaigns AS campaign
  WHERE campaign.id = buildpulse_social_ad_creatives.campaign_id
   AND campaign.advertiser_user_id = (SELECT auth.uid())
   AND campaign.status IN ('draft', 'submitted')
 )
)
WITH CHECK (
 moderation_status = 'pending'
 AND EXISTS (
  SELECT 1 FROM public.buildpulse_social_ad_campaigns AS campaign
  WHERE campaign.id = buildpulse_social_ad_creatives.campaign_id
   AND campaign.advertiser_user_id = (SELECT auth.uid())
   AND campaign.status IN ('draft', 'submitted')
 )
);
REVOKE UPDATE ON TABLE public.buildpulse_social_ad_creatives FROM anon, authenticated;
GRANT UPDATE (headline, body, media_path, call_to_action)
ON TABLE public.buildpulse_social_ad_creatives TO authenticated;
