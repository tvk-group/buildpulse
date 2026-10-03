-- BuildPulse fail-closed grants for server-only / unreleased event surfaces.
-- RLS already blocks these tables; remove inherited browser privileges as defense in depth.

REVOKE ALL ON public.buildpulse_affiliate_clicks FROM anon, authenticated;
REVOKE ALL ON public.buildpulse_social_ad_events FROM anon, authenticated;
REVOKE ALL ON public.buildpulse_social_reactions FROM anon, authenticated;

GRANT ALL ON public.buildpulse_affiliate_clicks TO service_role;
GRANT ALL ON public.buildpulse_social_ad_events TO service_role;
GRANT ALL ON public.buildpulse_social_reactions TO service_role;
