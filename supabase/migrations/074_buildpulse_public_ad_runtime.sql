CREATE OR REPLACE FUNCTION public.buildpulse_active_ad_for_placement(p_placement TEXT)
RETURNS TABLE (
  order_id UUID,
  headline TEXT,
  copy_text TEXT,
  product_id UUID,
  width_px INTEGER,
  height_px INTEGER,
  has_creative BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    o.id AS order_id,
    o.headline,
    o.copy_text,
    o.product_id,
    p.width_px,
    p.height_px,
    EXISTS (
      SELECT 1
      FROM public.buildpulse_ad_creatives c
      WHERE c.order_id = o.id
        AND c.review_state = 'approved'
    ) AS has_creative
  FROM public.buildpulse_ad_orders o
  JOIN public.buildpulse_ad_products p ON p.id = o.product_id
  WHERE o.status = 'active'
    AND p.active = TRUE
    AND p.placement = p_placement
    AND o.starts_at IS NOT NULL
    AND o.ends_at IS NOT NULL
    AND o.starts_at <= NOW()
    AND o.ends_at >= NOW()
  ORDER BY o.created_at ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.buildpulse_active_ad_for_placement(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buildpulse_active_ad_for_placement(TEXT) TO anon, authenticated;
COMMENT ON FUNCTION public.buildpulse_active_ad_for_placement(TEXT) IS
'Returns only publishable fields for one currently active BuildPulse ad in a placement.';

ALTER TABLE public.buildpulse_ad_orders
  DROP CONSTRAINT IF EXISTS buildpulse_ad_orders_https_destination_check;

ALTER TABLE public.buildpulse_ad_orders
  ADD CONSTRAINT buildpulse_ad_orders_https_destination_check
  CHECK (
    destination_url ~* '^https://'
    AND destination_url !~* '^https://(localhost|127\.|0\.0\.0\.0|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)'
  );
