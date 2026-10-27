-- Recipients may mark their notifications read but cannot rewrite sender-generated
-- notification contents, links, metadata, or timestamps.
-- The account notifications PATCH endpoint updates only read_at.
REVOKE UPDATE ON TABLE public.buildpulse_notifications FROM anon, authenticated;
GRANT UPDATE (read_at) ON TABLE public.buildpulse_notifications TO authenticated;
