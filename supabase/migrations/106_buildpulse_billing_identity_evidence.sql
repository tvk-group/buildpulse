ALTER TABLE public.buildpulse_advertiser_profiles
  ADD COLUMN IF NOT EXISTS customer_type TEXT NOT NULL DEFAULT 'b2b' CHECK (customer_type IN ('b2b','b2c')),
  ADD COLUMN IF NOT EXISTS billing_address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS billing_address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS billing_city TEXT,
  ADD COLUMN IF NOT EXISTS billing_region TEXT,
  ADD COLUMN IF NOT EXISTS billing_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS billing_country_code TEXT CHECK (billing_country_code IS NULL OR billing_country_code ~ '^[A-Z]{2}$'),
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS tax_id_type TEXT,
  ADD COLUMN IF NOT EXISTS tax_id_validation_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (tax_id_validation_status IN ('unverified','valid','invalid','unavailable'));

ALTER TABLE public.buildpulse_billing_invoices
  ADD COLUMN IF NOT EXISTS customer_type TEXT CHECK (customer_type IS NULL OR customer_type IN ('b2b','b2c')),
  ADD COLUMN IF NOT EXISTS billing_address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS billing_address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS billing_city TEXT,
  ADD COLUMN IF NOT EXISTS billing_region TEXT,
  ADD COLUMN IF NOT EXISTS billing_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS billing_country_code TEXT CHECK (billing_country_code IS NULL OR billing_country_code ~ '^[A-Z]{2}$'),
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS tax_id_type TEXT,
  ADD COLUMN IF NOT EXISTS tax_id_validation_status TEXT
    CHECK (tax_id_validation_status IS NULL OR tax_id_validation_status IN ('unverified','valid','invalid','unavailable'));

COMMENT ON COLUMN public.buildpulse_advertiser_profiles.tax_id_validation_status IS
'Validation state of the customer-supplied tax identifier. Never treat unverified as valid.';
COMMENT ON COLUMN public.buildpulse_billing_invoices.billing_country_code IS
'ISO 3166-1 alpha-2 billing country snapshot captured for the invoice.';
COMMENT ON COLUMN public.buildpulse_billing_invoices.tax_id_validation_status IS
'Invoice-time snapshot of tax ID validation state; unverified values must not be represented as validated.';
