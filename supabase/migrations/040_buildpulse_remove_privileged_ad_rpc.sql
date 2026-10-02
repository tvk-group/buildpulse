-- Browser clients no longer need a privileged order-creation RPC.
-- Campaign drafts are created by the authenticated Next.js server route using service-role access.
REVOKE ALL ON FUNCTION public.buildpulse_create_ad_order(TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.buildpulse_create_ad_order(TEXT,TEXT,TEXT,TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.buildpulse_create_ad_order(TEXT,TEXT,TEXT,TEXT) FROM authenticated;
DROP FUNCTION IF EXISTS public.buildpulse_create_ad_order(TEXT,TEXT,TEXT,TEXT);
