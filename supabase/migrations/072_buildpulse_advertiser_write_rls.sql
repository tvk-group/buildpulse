-- BuildPulse advertiser self-service writes under least-privilege RLS.

GRANT INSERT ON public.buildpulse_advertiser_profiles TO authenticated;
GRANT UPDATE (company_name,billing_email,website_url,updated_at) ON public.buildpulse_advertiser_profiles TO authenticated;

DROP POLICY IF EXISTS buildpulse_advertiser_profiles_own_insert ON public.buildpulse_advertiser_profiles;
CREATE POLICY buildpulse_advertiser_profiles_own_insert
  ON public.buildpulse_advertiser_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status = 'active'
  );

DROP POLICY IF EXISTS buildpulse_advertiser_profiles_own_update ON public.buildpulse_advertiser_profiles;
CREATE POLICY buildpulse_advertiser_profiles_own_update
  ON public.buildpulse_advertiser_profiles
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND status = 'active'
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status = 'active'
  );

GRANT INSERT (user_id,product_id,headline,copy_text,destination_url,status,amount_usd)
  ON public.buildpulse_ad_orders TO authenticated;

DROP POLICY IF EXISTS buildpulse_ad_orders_own_insert ON public.buildpulse_ad_orders;
CREATE POLICY buildpulse_ad_orders_own_insert
  ON public.buildpulse_ad_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status = 'draft'
    AND crypto_asset IS NULL
    AND crypto_network IS NULL
    AND payment_reference IS NULL
    AND payment_address IS NULL
    AND expected_crypto_amount IS NULL
    AND paid_tx_hash IS NULL
    AND paid_at IS NULL
    AND starts_at IS NULL
    AND ends_at IS NULL
    AND review_notes IS NULL
    AND payment_method IS NULL
    AND payment_provider IS NULL
    AND creative_url IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.buildpulse_ad_products p
      WHERE p.id = product_id
        AND p.active = TRUE
        AND p.price_usd = amount_usd
        AND char_length(COALESCE(copy_text,'')) <= p.max_copy_chars
    )
  );

-- Client roles never need table-level administrative privileges.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON
  public.buildpulse_ad_products,
  public.buildpulse_advertiser_profiles,
  public.buildpulse_ad_orders,
  public.buildpulse_ad_payment_quotes,
  public.buildpulse_ad_payment_events,
  public.buildpulse_billing_invoices,
  public.buildpulse_private_settings
FROM anon, authenticated;
