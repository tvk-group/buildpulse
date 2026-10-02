DROP POLICY IF EXISTS buildpulse_ad_creatives_admin_read ON public.buildpulse_ad_creatives;
DROP POLICY IF EXISTS buildpulse_ad_creatives_storage_admin_read ON storage.objects;

REVOKE ALL ON FUNCTION public.buildpulse_active_ad_for_placement(TEXT) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.buildpulse_active_ad_for_placement(TEXT);

REVOKE ALL ON FUNCTION public.buildpulse_admin_ad_queue() FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.buildpulse_admin_ad_queue();

REVOKE ALL ON FUNCTION public.buildpulse_admin_order_action(UUID,TEXT,TIMESTAMPTZ,TEXT) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.buildpulse_admin_order_action(UUID,TEXT,TIMESTAMPTZ,TEXT);

REVOKE ALL ON FUNCTION public.buildpulse_admin_review_creative(UUID,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.buildpulse_admin_review_creative(UUID,TEXT,TEXT);

REVOKE ALL ON FUNCTION public.buildpulse_admin_is_authorized() FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.buildpulse_admin_is_authorized();
