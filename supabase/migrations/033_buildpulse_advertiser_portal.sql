-- BuildPulse self-service advertiser portal and crypto-payment order ledger.
CREATE TABLE IF NOT EXISTS buildpulse_ad_products (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 placement TEXT NOT NULL CHECK(placement IN ('homepage','archive','edition_top','edition_inline','edition_footer','newsletter')),
 width_px INTEGER, height_px INTEGER, max_copy_chars INTEGER NOT NULL DEFAULT 300 CHECK(max_copy_chars BETWEEN 0 AND 300),
 price_usd NUMERIC(12,2) NOT NULL CHECK(price_usd>=0), duration_days INTEGER NOT NULL DEFAULT 7 CHECK(duration_days>0),
 active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS buildpulse_advertiser_profiles (
 user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, company_name TEXT, billing_email TEXT,
 website_url TEXT, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','closed')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS buildpulse_ad_orders (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 product_id UUID NOT NULL REFERENCES buildpulse_ad_products(id) ON DELETE RESTRICT, headline TEXT,
 copy_text TEXT CHECK(char_length(copy_text)<=300), destination_url TEXT NOT NULL, creative_url TEXT,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','awaiting_payment','payment_detected','review','approved','scheduled','active','completed','rejected','cancelled','expired')),
 amount_usd NUMERIC(12,2) NOT NULL CHECK(amount_usd>=0), crypto_asset TEXT, crypto_network TEXT, payment_reference TEXT,
 payment_address TEXT, expected_crypto_amount NUMERIC(38,18), paid_tx_hash TEXT, paid_at TIMESTAMPTZ,
 starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ, review_notes TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_buildpulse_ad_orders_payment_reference ON buildpulse_ad_orders(payment_reference) WHERE payment_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_buildpulse_ad_orders_user ON buildpulse_ad_orders(user_id,created_at DESC);
ALTER TABLE buildpulse_ad_products ENABLE ROW LEVEL SECURITY;ALTER TABLE buildpulse_advertiser_profiles ENABLE ROW LEVEL SECURITY;ALTER TABLE buildpulse_ad_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY buildpulse_ad_products_public_read ON buildpulse_ad_products FOR SELECT TO anon,authenticated USING(active=true);
CREATE POLICY buildpulse_ad_products_service_all ON buildpulse_ad_products FOR ALL TO service_role USING(true) WITH CHECK(true);
CREATE POLICY buildpulse_advertiser_profiles_own ON buildpulse_advertiser_profiles FOR ALL TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
CREATE POLICY buildpulse_advertiser_profiles_service_all ON buildpulse_advertiser_profiles FOR ALL TO service_role USING(true) WITH CHECK(true);
CREATE POLICY buildpulse_ad_orders_own_read ON buildpulse_ad_orders FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE POLICY buildpulse_ad_orders_own_create ON buildpulse_ad_orders FOR INSERT TO authenticated WITH CHECK(auth.uid()=user_id AND status='draft');
CREATE POLICY buildpulse_ad_orders_service_all ON buildpulse_ad_orders FOR ALL TO service_role USING(true) WITH CHECK(true);
GRANT SELECT ON buildpulse_ad_products TO anon,authenticated;GRANT SELECT,INSERT,UPDATE ON buildpulse_advertiser_profiles TO authenticated;GRANT SELECT,INSERT ON buildpulse_ad_orders TO authenticated;GRANT ALL ON buildpulse_ad_products,buildpulse_advertiser_profiles,buildpulse_ad_orders TO service_role;
