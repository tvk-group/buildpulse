-- Reconcile live BuildPulse Supabase security hardening applied 2026-10-27.
-- All ALTER POLICY/GRANT changes are idempotent. Review with multi-account tests before deployment.
ALTER VIEW public.buildpulse_localization_coverage SET (security_invoker = true);

ALTER POLICY buildpulse_contributor_own_insert ON public.buildpulse_contributor_submissions
 WITH CHECK (user_id=(SELECT auth.uid()) AND status='draft'
  AND payment_status='unpaid' AND fee_usd=149 AND ai_review_status='pending'
  AND human_review_required=true AND published_at IS NULL AND ai_reviewed_at IS NULL);
ALTER POLICY buildpulse_contributor_own_update ON public.buildpulse_contributor_submissions
 WITH CHECK (user_id=(SELECT auth.uid()) AND status IN ('draft','submitted','changes_requested'));
REVOKE UPDATE ON public.buildpulse_contributor_submissions FROM PUBLIC,anon,authenticated;
GRANT UPDATE (author_name,title,dek,body,source_urls,disclosure,
 rights_confirmed,accuracy_confirmed,responsibility_confirmed,status)
 ON public.buildpulse_contributor_submissions TO authenticated;

ALTER POLICY buildpulse_art_own_insert ON public.buildpulse_art_submissions
 WITH CHECK (user_id=(SELECT auth.uid()) AND status IN ('draft','submitted')
  AND ai_review_status='pending' AND human_review_required=true AND published_at IS NULL);
ALTER POLICY buildpulse_art_own_update ON public.buildpulse_art_submissions
 WITH CHECK (user_id=(SELECT auth.uid()) AND status IN ('draft','submitted','changes_requested'));
REVOKE UPDATE ON public.buildpulse_art_submissions FROM PUBLIC,anon,authenticated;
GRANT UPDATE (creator_name,title,discipline,description,portfolio_url,media_urls,
 rights_confirmed,original_work_confirmed,people_release_confirmed,
 commercial_relationships,ai_assistance_disclosure,status)
 ON public.buildpulse_art_submissions TO authenticated;

ALTER POLICY bp_market_own_insert ON public.buildpulse_marketplace_listings
 WITH CHECK (seller_id=(SELECT auth.uid()) AND status IN ('draft','submitted')
  AND published_at IS NULL AND moderation_flags='[]'::jsonb);
REVOKE UPDATE ON public.buildpulse_marketplace_listings FROM PUBLIC,anon,authenticated;
GRANT UPDATE (category,title,description,price_amount,currency,condition,
 media_urls,country_code,region,city,delivery_methods)
 ON public.buildpulse_marketplace_listings TO authenticated;

ALTER POLICY bp_social_ad_campaigns_owner_update ON public.buildpulse_social_ad_campaigns
 WITH CHECK (advertiser_user_id=(SELECT auth.uid()) AND status IN ('draft','submitted','paused'));
REVOKE UPDATE ON public.buildpulse_social_ad_campaigns FROM PUBLIC,anon,authenticated;
GRANT UPDATE (name,objective,placement,target_context,destination_url,
 budget_usd,daily_cap_usd,status) ON public.buildpulse_social_ad_campaigns TO authenticated;

ALTER POLICY "subscription owner preferences" ON public.buildpulse_intelligence_subscriptions
 USING (user_id=(SELECT auth.uid()))
 WITH CHECK (user_id=(SELECT auth.uid()));
REVOKE UPDATE ON public.buildpulse_intelligence_subscriptions FROM PUBLIC,anon,authenticated;
GRANT UPDATE (topics,watchlist,delivery_timezone,marketing_consent,service_email_consent)
 ON public.buildpulse_intelligence_subscriptions TO authenticated;
