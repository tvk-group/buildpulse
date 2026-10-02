INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('buildpulse-ad-creatives','buildpulse-ad-creatives',false,5242880,ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=5242880,allowed_mime_types=ARRAY['image/png','image/jpeg','image/webp'];
DROP POLICY IF EXISTS buildpulse_ad_creatives_storage_service_insert ON storage.objects;
CREATE POLICY buildpulse_ad_creatives_storage_service_insert ON storage.objects FOR INSERT TO service_role WITH CHECK(bucket_id='buildpulse-ad-creatives');
DROP POLICY IF EXISTS buildpulse_ad_creatives_storage_service_read ON storage.objects;
CREATE POLICY buildpulse_ad_creatives_storage_service_read ON storage.objects FOR SELECT TO service_role USING(bucket_id='buildpulse-ad-creatives');
DROP POLICY IF EXISTS buildpulse_ad_creatives_storage_service_delete ON storage.objects;
CREATE POLICY buildpulse_ad_creatives_storage_service_delete ON storage.objects FOR DELETE TO service_role USING(bucket_id='buildpulse-ad-creatives');
