-- Security: the agent permission controller must also control the target profile.
-- Prevent an authenticated user from assigning permissions over another user's agent.
-- An account acting on its own profile remains permitted. Agent/robot controllers
-- must be assigned through the trusted backend, not browser-editable profile columns.
ALTER POLICY bp_social_agent_permissions_controller
ON public.buildpulse_social_agent_permissions
TO authenticated
USING (
  controller_user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.buildpulse_social_profiles AS profile
    WHERE profile.user_id = buildpulse_social_agent_permissions.profile_user_id
      AND profile.account_type IN ('agent', 'robot')
      AND (
        profile.user_id = (SELECT auth.uid())
        OR profile.controller_user_id = (SELECT auth.uid())
      )
  )
)
WITH CHECK (
  controller_user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.buildpulse_social_profiles AS profile
    WHERE profile.user_id = buildpulse_social_agent_permissions.profile_user_id
      AND profile.account_type IN ('agent', 'robot')
      AND (
        profile.user_id = (SELECT auth.uid())
        OR profile.controller_user_id = (SELECT auth.uid())
      )
  )
);
