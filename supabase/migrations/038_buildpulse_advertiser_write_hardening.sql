-- Harden BuildPulse advertiser self-service writes.
-- Advertisers may edit presentation/billing fields only; status and order economics remain server-controlled.

DROP POLICY IF EXISTS buildpulse_advertiser_profiles_own ON buildpulse_advertiser_profiles;
CREATE POLICY buildpulse_advertiser_profiles_own_read
  ON buildpulse_advertiser_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY buildpulse_advertiser_profiles_own_create
  ON buildpulse_advertiser_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'active');
CREATE POLICY buildpulse_advertiser_profiles_own_update
  ON buildpulse_advertiser_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'active')
  WITH CHECK (auth.uid() = user_id AND status = 'active');

REVOKE INSERT, UPDATE ON buildpulse_advertiser_profiles FROM authenticated;
GRANT INSERT (user_id, company_name, billing_email, website_url) ON buildpulse_advertiser_profiles TO authenticated;
GRANT UPDATE (company_name, billing_email, website_url, updated_at) ON buildpulse_advertiser_profiles TO authenticated;

DROP POLICY IF EXISTS buildpulse_ad_orders_own_create ON buildpulse_ad_orders;
REVOKE INSERT, UPDATE, DELETE ON buildpulse_ad_orders FROM authenticated;

CREATE OR REPLACE FUNCTION buildpulse_create_ad_order(
  p_product_code TEXT,
  p_headline TEXT,
  p_copy_text TEXT,
  p_destination_url TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_product buildpulse_ad_products%ROWTYPE;
  v_order UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM buildpulse_advertiser_profiles
    WHERE user_id = v_user AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'active_advertiser_profile_required';
  END IF;

  SELECT * INTO v_product
  FROM buildpulse_ad_products
  WHERE code = p_product_code AND active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_ad_product';
  END IF;

  IF char_length(coalesce(p_copy_text, '')) > v_product.max_copy_chars THEN
    RAISE EXCEPTION 'copy_too_long';
  END IF;

  IF p_destination_url IS NULL
     OR p_destination_url !~* '^https://[a-z0-9][a-z0-9.-]*(?::[0-9]+)?(?:/|$)' THEN
    RAISE EXCEPTION 'https_destination_required';
  END IF;

  INSERT INTO buildpulse_ad_orders (
    user_id, product_id, headline, copy_text, destination_url,
    status, amount_usd, starts_at, ends_at
  ) VALUES (
    v_user, v_product.id, nullif(trim(p_headline), ''), nullif(trim(p_copy_text), ''),
    trim(p_destination_url), 'draft', v_product.price_usd, NULL, NULL
  )
  RETURNING id INTO v_order;

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION buildpulse_create_ad_order(TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION buildpulse_create_ad_order(TEXT,TEXT,TEXT,TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION buildpulse_create_ad_order(TEXT,TEXT,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION buildpulse_create_ad_order(TEXT,TEXT,TEXT,TEXT) TO service_role;
