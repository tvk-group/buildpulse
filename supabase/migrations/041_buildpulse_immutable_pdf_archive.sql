ALTER TABLE buildpulse_editions
  ADD COLUMN IF NOT EXISTS pdf_revision INTEGER,
  ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pdf_byte_size BIGINT,
  ADD COLUMN IF NOT EXISTS pdf_content_type TEXT,
  ADD COLUMN IF NOT EXISTS pdf_storage_bucket TEXT;

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('buildpulse-editions','buildpulse-editions',true,10485760,ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET public=true,file_size_limit=10485760,allowed_mime_types=ARRAY['application/pdf'];

DROP POLICY IF EXISTS buildpulse_edition_pdfs_service_insert ON storage.objects;
CREATE POLICY buildpulse_edition_pdfs_service_insert ON storage.objects FOR INSERT TO service_role
WITH CHECK (bucket_id='buildpulse-editions');
DROP POLICY IF EXISTS buildpulse_edition_pdfs_service_update ON storage.objects;
CREATE POLICY buildpulse_edition_pdfs_service_update ON storage.objects FOR UPDATE TO service_role
USING (bucket_id='buildpulse-editions') WITH CHECK (bucket_id='buildpulse-editions');
DROP POLICY IF EXISTS buildpulse_edition_pdfs_service_delete ON storage.objects;
CREATE POLICY buildpulse_edition_pdfs_service_delete ON storage.objects FOR DELETE TO service_role
USING (bucket_id='buildpulse-editions');
