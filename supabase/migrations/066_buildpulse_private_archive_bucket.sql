-- BuildPulse immutable archive: keep artifacts non-public at the storage layer.
-- Public access is mediated by the sent/archive-visible edition route.
UPDATE storage.buckets SET public=false WHERE id='buildpulse-editions';
DROP POLICY IF EXISTS buildpulse_edition_pdfs_public_read ON storage.objects;
