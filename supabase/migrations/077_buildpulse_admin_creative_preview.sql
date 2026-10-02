DROP POLICY IF EXISTS buildpulse_ad_creatives_admin_read ON public.buildpulse_ad_creatives;
CREATE POLICY buildpulse_ad_creatives_admin_read
  ON public.buildpulse_ad_creatives
  FOR SELECT TO authenticated
  USING (public.buildpulse_admin_is_authorized());

DROP POLICY IF EXISTS buildpulse_ad_creatives_storage_admin_read ON storage.objects;
CREATE POLICY buildpulse_ad_creatives_storage_admin_read
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id='buildpulse-ad-creatives'
    AND public.buildpulse_admin_is_authorized()
  );