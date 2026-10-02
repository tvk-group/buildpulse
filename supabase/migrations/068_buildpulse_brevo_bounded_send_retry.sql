ALTER TABLE public.buildpulse_editions
  ADD COLUMN IF NOT EXISTS brevo_send_retry_count integer NOT NULL DEFAULT 0
    CHECK (brevo_send_retry_count >= 0 AND brevo_send_retry_count <= 10),
  ADD COLUMN IF NOT EXISTS brevo_last_retry_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_buildpulse_editions_delivery_retry
  ON public.buildpulse_editions(brevo_dispatch_state, brevo_send_retry_count, brevo_last_retry_at)
  WHERE brevo_campaign_id IS NOT NULL AND status IN ('approved','scheduled','sending');
