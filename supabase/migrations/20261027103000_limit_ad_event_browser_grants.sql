-- Browser access to ad events is read-only, scoped by existing RLS.
-- Keep service_role write access for payment and event ingestion.
REVOKE ALL PRIVILEGES ON TABLE public.buildpulse_ad_events FROM anon, authenticated;
GRANT SELECT ON TABLE public.buildpulse_ad_events TO authenticated;
