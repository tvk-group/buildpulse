UPDATE public.buildpulse_ad_products SET stripe_payment_link_url = CASE code
  WHEN 'SPONSOR_RAIL' THEN 'https://buy.stripe.com/4gMfZh93vffLaDf8kDgA80h'
  WHEN 'SECTION_LEADERBOARD' THEN 'https://buy.stripe.com/5kQ5kD2F75FbbHj0SbgA80i'
  WHEN 'EXHIBITION_CARD' THEN 'https://buy.stripe.com/cNibJ193v2sZ5iV30jgA80m'
  WHEN 'ARTS_SPOTLIGHT' THEN 'https://buy.stripe.com/bJe14n3Jb3x3cLnfN5gA80k'
  WHEN 'ARTS_SECTION_SPONSOR' THEN 'https://buy.stripe.com/4gM3cvfrT6Jf8v7gR9gA80l'
  ELSE stripe_payment_link_url END
WHERE code IN ('SPONSOR_RAIL','SECTION_LEADERBOARD','EXHIBITION_CARD','ARTS_SPOTLIGHT','ARTS_SECTION_SPONSOR');

ALTER TABLE public.buildpulse_ad_products
  DROP CONSTRAINT IF EXISTS buildpulse_ad_products_stripe_link_complete;

ALTER TABLE public.buildpulse_ad_products
  ADD CONSTRAINT buildpulse_ad_products_stripe_link_complete
  CHECK (
    stripe_payment_link_id IS NULL
    OR (
      stripe_payment_link_url IS NOT NULL
      AND stripe_payment_link_url ~ '^https://buy\.stripe\.com/'
    )
  );
