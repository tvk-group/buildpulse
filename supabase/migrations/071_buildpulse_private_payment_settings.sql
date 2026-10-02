CREATE TABLE IF NOT EXISTS public.buildpulse_private_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.buildpulse_private_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.buildpulse_private_settings FROM anon, authenticated;
GRANT ALL ON public.buildpulse_private_settings TO service_role;

ALTER TABLE public.buildpulse_billing_invoices
  DROP CONSTRAINT IF EXISTS buildpulse_billing_invoices_status_check;

ALTER TABLE public.buildpulse_billing_invoices
  ADD CONSTRAINT buildpulse_billing_invoices_status_check
  CHECK(status IN ('open','paid','void','refunded','partially_refunded','disputed'));

COMMENT ON TABLE public.buildpulse_private_settings IS
'Server-only BuildPulse runtime settings. RLS has no client policies; access is restricted to service_role.';
