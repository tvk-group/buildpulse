REVOKE ALL ON TABLE public.buildpulse_job_runs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.buildpulse_job_runs TO service_role;
COMMENT ON TABLE public.buildpulse_job_runs IS 'Server-only BuildPulse scheduler audit ledger. RLS intentionally has no client policy; service_role receives explicit CRUD grants.';
