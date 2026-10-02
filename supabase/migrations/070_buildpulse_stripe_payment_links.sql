ALTER TABLE public.buildpulse_ad_products
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_link_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_link_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_buildpulse_ad_products_stripe_payment_link_id
  ON public.buildpulse_ad_products(stripe_payment_link_id)
  WHERE stripe_payment_link_id IS NOT NULL;

COMMENT ON COLUMN public.buildpulse_ad_products.stripe_payment_link_url IS
'Public live Stripe Payment Link URL. BuildPulse appends client_reference_id=<order UUID> at redirect time for reconciliation.';
