-- Restrict privileged accounting functions to the backend service role only.
REVOKE ALL ON FUNCTION public.buildpulse_next_document_number(uuid,text,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buildpulse_next_document_number(uuid,text,timestamptz) TO service_role;

REVOKE ALL ON FUNCTION public.buildpulse_post_paid_invoice_journal(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buildpulse_post_paid_invoice_journal(uuid) TO service_role;

COMMENT ON FUNCTION public.buildpulse_next_document_number(uuid,text,timestamptz) IS
'Internal fiscal document sequence allocator. Service-role only.';
COMMENT ON FUNCTION public.buildpulse_post_paid_invoice_journal(uuid) IS
'Internal accounting journal poster. Service-role only; requires a paid document and base-currency-safe posting.';
