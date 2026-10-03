-- BuildPulse social RLS correctness and performance hardening.
-- Fix ambiguous message membership predicates, retire superseded policies,
-- optimize auth.uid() evaluation, and cover remaining social foreign keys.

DROP POLICY IF EXISTS "conversation members read ciphertext" ON public.buildpulse_social_messages;
DROP POLICY IF EXISTS "conversation members send ciphertext" ON public.buildpulse_social_messages;
DROP POLICY IF EXISTS bp_social_messages_member_read ON public.buildpulse_social_messages;
DROP POLICY IF EXISTS bp_social_messages_member_insert ON public.buildpulse_social_messages;

CREATE POLICY bp_social_messages_member_read ON public.buildpulse_social_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.buildpulse_social_members AS member
    WHERE member.conversation_id = buildpulse_social_messages.conversation_id
      AND member.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY bp_social_messages_member_insert ON public.buildpulse_social_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.buildpulse_social_members AS member
    WHERE member.conversation_id = buildpulse_social_messages.conversation_id
      AND member.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "public social profiles readable" ON public.buildpulse_social_profiles;
DROP POLICY IF EXISTS "own social profile" ON public.buildpulse_social_profiles;
DROP POLICY IF EXISTS "public social posts readable" ON public.buildpulse_social_posts;
DROP POLICY IF EXISTS "own social posts" ON public.buildpulse_social_posts;
DROP POLICY IF EXISTS "conversation members read conversations" ON public.buildpulse_social_conversations;
DROP POLICY IF EXISTS "agent controller manages permissions" ON public.buildpulse_social_agent_permissions;
DROP POLICY IF EXISTS "advertiser manages social campaigns" ON public.buildpulse_social_ad_campaigns;
DROP POLICY IF EXISTS "advertiser reads campaign creatives" ON public.buildpulse_social_ad_creatives;
DROP POLICY IF EXISTS "users manage own crypto devices" ON public.buildpulse_social_crypto_devices;

DROP POLICY IF EXISTS "subscription owner read" ON public.buildpulse_intelligence_subscriptions;
CREATE POLICY "subscription owner read" ON public.buildpulse_intelligence_subscriptions
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "subscription owner preferences" ON public.buildpulse_intelligence_subscriptions;
CREATE POLICY "subscription owner preferences" ON public.buildpulse_intelligence_subscriptions
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "own safety actions" ON public.buildpulse_social_safety_actions;
CREATE POLICY "own safety actions" ON public.buildpulse_social_safety_actions
FOR ALL TO authenticated
USING (actor_id = (SELECT auth.uid()))
WITH CHECK (actor_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_bp_social_ad_events_campaign
  ON public.buildpulse_social_ad_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_bp_social_ad_events_creative
  ON public.buildpulse_social_ad_events(creative_id);
CREATE INDEX IF NOT EXISTS idx_bp_social_reactions_user
  ON public.buildpulse_social_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_bp_social_safety_actions_actor
  ON public.buildpulse_social_safety_actions(actor_id);
CREATE INDEX IF NOT EXISTS idx_bp_social_safety_actions_target_post
  ON public.buildpulse_social_safety_actions(target_post_id) WHERE target_post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bp_social_safety_actions_target_user
  ON public.buildpulse_social_safety_actions(target_user_id) WHERE target_user_id IS NOT NULL;
