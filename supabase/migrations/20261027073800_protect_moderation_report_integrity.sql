-- Verified on dedicated BuildPulse production Supabase on 2026-10-27.
-- Users may file safety reports and manage block/mute state; only workforce services
-- may set review status, reviewer identity, review timestamps, or delete report evidence.
DROP POLICY IF EXISTS "own safety actions" ON public.buildpulse_social_safety_actions;
DROP POLICY IF EXISTS bp_social_safety_owner_read ON public.buildpulse_social_safety_actions;
DROP POLICY IF EXISTS bp_social_safety_owner_report ON public.buildpulse_social_safety_actions;
DROP POLICY IF EXISTS bp_social_safety_owner_unblock ON public.buildpulse_social_safety_actions;
CREATE POLICY bp_social_safety_owner_read ON public.buildpulse_social_safety_actions
 FOR SELECT TO authenticated USING (actor_id=(SELECT auth.uid()));
CREATE POLICY bp_social_safety_owner_report ON public.buildpulse_social_safety_actions
 FOR INSERT TO authenticated
 WITH CHECK (actor_id=(SELECT auth.uid()) AND review_status='pending'
   AND reviewed_by IS NULL AND reviewed_at IS NULL AND review_notes IS NULL);
CREATE POLICY bp_social_safety_owner_unblock ON public.buildpulse_social_safety_actions
 FOR DELETE TO authenticated
 USING (actor_id=(SELECT auth.uid()) AND action IN ('block','mute'));
REVOKE UPDATE ON public.buildpulse_social_safety_actions FROM PUBLIC,anon,authenticated;

DROP POLICY IF EXISTS bp_safety_own ON public.buildpulse_user_safety_actions;
DROP POLICY IF EXISTS bp_user_safety_owner_read ON public.buildpulse_user_safety_actions;
DROP POLICY IF EXISTS bp_user_safety_owner_report ON public.buildpulse_user_safety_actions;
DROP POLICY IF EXISTS bp_user_safety_owner_unblock ON public.buildpulse_user_safety_actions;
CREATE POLICY bp_user_safety_owner_read ON public.buildpulse_user_safety_actions
 FOR SELECT TO authenticated USING (actor_id=(SELECT auth.uid()));
CREATE POLICY bp_user_safety_owner_report ON public.buildpulse_user_safety_actions
 FOR INSERT TO authenticated
 WITH CHECK (actor_id=(SELECT auth.uid()) AND review_status='pending'
   AND reviewed_by IS NULL AND reviewed_at IS NULL AND review_notes IS NULL);
CREATE POLICY bp_user_safety_owner_unblock ON public.buildpulse_user_safety_actions
 FOR DELETE TO authenticated USING (actor_id=(SELECT auth.uid()) AND action='block');
REVOKE UPDATE ON public.buildpulse_user_safety_actions FROM PUBLIC,anon,authenticated;
