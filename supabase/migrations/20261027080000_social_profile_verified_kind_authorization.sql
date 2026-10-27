-- Live applied and SQL-verified 2026-10-27: user-owned social profiles
-- must not make themselves verified or bind another user's controller identity.
ALTER POLICY bp_social_profiles_own_insert
 ON public.buildpulse_social_profiles
 WITH CHECK (
  user_id = (SELECT auth.uid())
  AND verified_kind IS NULL
  AND controller_user_id IS NULL
 );
REVOKE UPDATE ON public.buildpulse_social_profiles FROM PUBLIC,anon,authenticated;
GRANT UPDATE (handle,display_name,bio,avatar_path,discoverable,
 allow_messages,automation_disclosed,updated_at)
 ON public.buildpulse_social_profiles TO authenticated;
-- After applying: authenticated UPDATE(verified_kind,controller_user_id) must be false.
