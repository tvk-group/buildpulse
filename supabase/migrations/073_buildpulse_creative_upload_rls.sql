-- Authenticated advertiser creative upload under ownership-constrained RLS.

GRANT INSERT (order_id,storage_path,mime_type,byte_size,width_px,height_px,sha256,review_state)
  ON public.buildpulse_ad_creatives TO authenticated;

DROP POLICY IF EXISTS buildpulse_ad_creatives_own_insert ON public.buildpulse_ad_creatives;
CREATE POLICY buildpulse_ad_creatives_own_insert
  ON public.buildpulse_ad_creatives
  FOR INSERT TO authenticated
  WITH CHECK (
    review_state = 'pending'
    AND review_notes IS NULL
    AND reviewed_at IS NULL
    AND reviewed_by IS NULL
    AND storage_path LIKE ((SELECT auth.uid())::text || '/' || order_id::text || '/%')
    AND EXISTS (
      SELECT 1
      FROM public.buildpulse_ad_orders o
      WHERE o.id = order_id
        AND o.user_id = (SELECT auth.uid())
        AND o.status IN ('draft','awaiting_payment','payment_detected','review')
    )
  );

DROP POLICY IF EXISTS buildpulse_ad_creatives_storage_own_insert ON storage.objects;
CREATE POLICY buildpulse_ad_creatives_storage_own_insert
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'buildpulse-ad-creatives'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND EXISTS (
      SELECT 1
      FROM public.buildpulse_ad_orders o
      WHERE o.user_id = (SELECT auth.uid())
        AND o.id::text = (storage.foldername(name))[2]
        AND o.status IN ('draft','awaiting_payment','payment_detected','review')
    )
  );

DROP POLICY IF EXISTS buildpulse_ad_creatives_storage_own_delete ON storage.objects;
CREATE POLICY buildpulse_ad_creatives_storage_own_delete
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'buildpulse-ad-creatives'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.buildpulse_ad_creatives FROM anon, authenticated;
