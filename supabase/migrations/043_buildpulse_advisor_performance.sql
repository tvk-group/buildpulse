-- BuildPulse-specific advisor remediation: covering indexes and init-plan-safe auth predicates.
CREATE INDEX IF NOT EXISTS idx_buildpulse_ad_orders_product ON buildpulse_ad_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_buildpulse_consent_events_subscriber ON buildpulse_consent_events(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_buildpulse_delivery_events_subscriber ON buildpulse_delivery_events(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_buildpulse_edition_stories_story ON buildpulse_edition_stories(story_id);
CREATE INDEX IF NOT EXISTS idx_buildpulse_review_events_edition ON buildpulse_review_events(edition_id);
CREATE INDEX IF NOT EXISTS idx_buildpulse_review_events_story ON buildpulse_review_events(story_id);
CREATE INDEX IF NOT EXISTS idx_buildpulse_stories_source ON buildpulse_stories(source_id);

DROP POLICY IF EXISTS buildpulse_ad_orders_own_read ON buildpulse_ad_orders;
CREATE POLICY buildpulse_ad_orders_own_read ON buildpulse_ad_orders FOR SELECT TO authenticated USING(user_id=(select auth.uid()));
DROP POLICY IF EXISTS buildpulse_ad_events_own_read ON buildpulse_ad_events;
CREATE POLICY buildpulse_ad_events_own_read ON buildpulse_ad_events FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM buildpulse_ad_orders o WHERE o.id=order_id AND o.user_id=(select auth.uid())));
DROP POLICY IF EXISTS buildpulse_advertiser_profiles_own_read ON buildpulse_advertiser_profiles;
CREATE POLICY buildpulse_advertiser_profiles_own_read ON buildpulse_advertiser_profiles FOR SELECT TO authenticated USING(user_id=(select auth.uid()));
DROP POLICY IF EXISTS buildpulse_advertiser_profiles_own_create ON buildpulse_advertiser_profiles;
CREATE POLICY buildpulse_advertiser_profiles_own_create ON buildpulse_advertiser_profiles FOR INSERT TO authenticated WITH CHECK(user_id=(select auth.uid()) AND status='active');
DROP POLICY IF EXISTS buildpulse_advertiser_profiles_own_update ON buildpulse_advertiser_profiles;
CREATE POLICY buildpulse_advertiser_profiles_own_update ON buildpulse_advertiser_profiles FOR UPDATE TO authenticated USING(user_id=(select auth.uid()) AND status='active') WITH CHECK(user_id=(select auth.uid()) AND status='active');
DROP POLICY IF EXISTS buildpulse_ad_payment_events_own_read ON buildpulse_ad_payment_events;
CREATE POLICY buildpulse_ad_payment_events_own_read ON buildpulse_ad_payment_events FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM buildpulse_ad_orders o WHERE o.id=order_id AND o.user_id=(select auth.uid())));
DROP POLICY IF EXISTS buildpulse_ad_creatives_own_read ON buildpulse_ad_creatives;
CREATE POLICY buildpulse_ad_creatives_own_read ON buildpulse_ad_creatives FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM buildpulse_ad_orders o WHERE o.id=order_id AND o.user_id=(select auth.uid())));
