CREATE OR REPLACE FUNCTION public.buildpulse_admin_is_authorized()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.role_assignments r
    WHERE r.user_id = (SELECT auth.uid())
      AND r.role = 'admin'
      AND r.revoked_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.buildpulse_admin_is_authorized() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buildpulse_admin_is_authorized() TO authenticated;

CREATE OR REPLACE FUNCTION public.buildpulse_admin_review_creative(
  p_creative_id UUID,
  p_decision TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c RECORD;
  p RECORD;
  reviewer TEXT;
BEGIN
  IF NOT public.buildpulse_admin_is_authorized() THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE='42501';
  END IF;
  IF p_decision NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'invalid_decision' USING ERRCODE='22023';
  END IF;

  SELECT c0.*, o.product_id
    INTO c
  FROM public.buildpulse_ad_creatives c0
  JOIN public.buildpulse_ad_orders o ON o.id=c0.order_id
  WHERE c0.id=p_creative_id
  FOR UPDATE OF c0;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'creative_not_found' USING ERRCODE='P0002';
  END IF;

  SELECT width_px,height_px INTO p
  FROM public.buildpulse_ad_products
  WHERE id=c.product_id;

  IF p_decision='approved' AND p.width_px IS NOT NULL AND p.height_px IS NOT NULL
     AND (c.width_px IS DISTINCT FROM p.width_px OR c.height_px IS DISTINCT FROM p.height_px) THEN
    RAISE EXCEPTION 'creative_dimensions_mismatch' USING ERRCODE='22023';
  END IF;

  reviewer=COALESCE(auth.jwt()->>'email',(SELECT auth.uid())::text);
  UPDATE public.buildpulse_ad_creatives
  SET review_state=p_decision,
      review_notes=NULLIF(BTRIM(COALESCE(p_notes,'')),''),
      reviewed_at=NOW(),
      reviewed_by=reviewer
  WHERE id=p_creative_id;

  RETURN jsonb_build_object('ok',true,'creativeId',p_creative_id,'state',p_decision,'reviewedBy',reviewer);
END;
$$;

REVOKE ALL ON FUNCTION public.buildpulse_admin_review_creative(UUID,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buildpulse_admin_review_creative(UUID,TEXT,TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.buildpulse_admin_order_action(
  p_order_id UUID,
  p_action TEXT,
  p_starts_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  o RECORD;
  p RECORD;
  latest_payment TEXT;
  finish_at TIMESTAMPTZ;
  reviewer TEXT;
BEGIN
  IF NOT public.buildpulse_admin_is_authorized() THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE='42501';
  END IF;
  IF p_action NOT IN ('approve','reject','schedule') THEN
    RAISE EXCEPTION 'invalid_action' USING ERRCODE='22023';
  END IF;

  SELECT * INTO o
  FROM public.buildpulse_ad_orders
  WHERE id=p_order_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found' USING ERRCODE='P0002'; END IF;

  reviewer=COALESCE(auth.jwt()->>'email',(SELECT auth.uid())::text);

  IF p_action='reject' THEN
    UPDATE public.buildpulse_ad_orders
    SET status='rejected',
        review_notes=NULLIF(BTRIM(COALESCE(p_notes,'')),''),
        updated_at=NOW()
    WHERE id=p_order_id
      AND status IN ('payment_detected','review','approved','scheduled');
    IF NOT FOUND THEN RAISE EXCEPTION 'order_not_rejectable' USING ERRCODE='55000'; END IF;
    RETURN jsonb_build_object('ok',true,'state','rejected','reviewedBy',reviewer);
  END IF;

  SELECT e.state INTO latest_payment
  FROM public.buildpulse_ad_payment_events e
  WHERE e.order_id=p_order_id
  ORDER BY e.observed_at DESC
  LIMIT 1;
  IF latest_payment IS DISTINCT FROM 'confirmed' THEN
    RAISE EXCEPTION 'confirmed_payment_required' USING ERRCODE='55000';
  END IF;

  SELECT * INTO p FROM public.buildpulse_ad_products WHERE id=o.product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'product_not_found' USING ERRCODE='P0002'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.buildpulse_ad_creatives c
    WHERE c.order_id=p_order_id AND c.review_state<>'approved'
  ) THEN
    RAISE EXCEPTION 'creative_review_incomplete' USING ERRCODE='55000';
  END IF;

  IF p.width_px IS NOT NULL AND p.height_px IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.buildpulse_ad_creatives c
    WHERE c.order_id=p_order_id AND c.review_state='approved'
  ) THEN
    RAISE EXCEPTION 'approved_creative_required' USING ERRCODE='55000';
  END IF;

  IF p_action='approve' THEN
    UPDATE public.buildpulse_ad_orders
    SET status='approved',
        review_notes=NULLIF(BTRIM(COALESCE(p_notes,'')),''),
        updated_at=NOW()
    WHERE id=p_order_id AND status IN ('payment_detected','review');
    IF NOT FOUND THEN RAISE EXCEPTION 'order_not_approvable' USING ERRCODE='55000'; END IF;
    RETURN jsonb_build_object('ok',true,'state','approved','reviewedBy',reviewer);
  END IF;

  IF o.status<>'approved' OR p_starts_at IS NULL OR p_starts_at < NOW()-INTERVAL '1 minute' THEN
    RAISE EXCEPTION 'approved_order_and_valid_start_required' USING ERRCODE='22023';
  END IF;

  finish_at=p_starts_at+(p.duration_days||' days')::interval;
  PERFORM pg_advisory_xact_lock(hashtext(o.product_id::text));

  IF EXISTS (
    SELECT 1
    FROM public.buildpulse_ad_orders other
    WHERE other.product_id=o.product_id
      AND other.id<>p_order_id
      AND other.status IN ('scheduled','active')
      AND other.starts_at<finish_at
      AND other.ends_at>p_starts_at
  ) THEN
    RAISE EXCEPTION 'inventory_conflict' USING ERRCODE='23P01';
  END IF;

  UPDATE public.buildpulse_ad_orders
  SET status='scheduled',
      starts_at=p_starts_at,
      ends_at=finish_at,
      review_notes=NULLIF(BTRIM(COALESCE(p_notes,'')),''),
      updated_at=NOW()
  WHERE id=p_order_id AND status='approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'order_no_longer_schedulable' USING ERRCODE='55000'; END IF;

  RETURN jsonb_build_object('ok',true,'state','scheduled','startsAt',p_starts_at,'endsAt',finish_at,'scheduledBy',reviewer);
END;
$$;

REVOKE ALL ON FUNCTION public.buildpulse_admin_order_action(UUID,TEXT,TIMESTAMPTZ,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buildpulse_admin_order_action(UUID,TEXT,TIMESTAMPTZ,TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.buildpulse_admin_ad_queue()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.buildpulse_admin_is_authorized() THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE='42501';
  END IF;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY created_at DESC),'[]'::jsonb)
  INTO result
  FROM (
    SELECT
      o.created_at,
      jsonb_build_object(
        'id',o.id,
        'status',o.status,
        'headline',o.headline,
        'copyText',o.copy_text,
        'destinationUrl',o.destination_url,
        'amountUsd',o.amount_usd,
        'createdAt',o.created_at,
        'startsAt',o.starts_at,
        'endsAt',o.ends_at,
        'reviewNotes',o.review_notes,
        'product',jsonb_build_object(
          'code',p.code,'name',p.name,'placement',p.placement,
          'widthPx',p.width_px,'heightPx',p.height_px,'durationDays',p.duration_days
        ),
        'advertiser',jsonb_build_object(
          'companyName',a.company_name,'billingEmail',a.billing_email,'websiteUrl',a.website_url
        ),
        'paymentState',(
          SELECT e.state FROM public.buildpulse_ad_payment_events e
          WHERE e.order_id=o.id ORDER BY e.observed_at DESC LIMIT 1
        ),
        'creatives',COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id',c.id,'mimeType',c.mime_type,'byteSize',c.byte_size,'widthPx',c.width_px,
            'heightPx',c.height_px,'sha256',c.sha256,'reviewState',c.review_state,
            'reviewNotes',c.review_notes,'createdAt',c.created_at
          ) ORDER BY c.created_at DESC)
          FROM public.buildpulse_ad_creatives c WHERE c.order_id=o.id
        ),'[]'::jsonb)
      ) AS row_data
    FROM public.buildpulse_ad_orders o
    JOIN public.buildpulse_ad_products p ON p.id=o.product_id
    LEFT JOIN public.buildpulse_advertiser_profiles a ON a.user_id=o.user_id
    WHERE o.status IN ('payment_detected','review','approved','scheduled','active')
    LIMIT 250
  ) q;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.buildpulse_admin_ad_queue() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buildpulse_admin_ad_queue() TO authenticated;

CREATE OR REPLACE FUNCTION public.buildpulse_activate_ads()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  activated_count INTEGER:=0;
  completed_count INTEGER:=0;
BEGIN
  WITH eligible AS (
    SELECT o.id
    FROM public.buildpulse_ad_orders o
    JOIN public.buildpulse_ad_products p ON p.id=o.product_id
    WHERE o.status='scheduled'
      AND o.starts_at<=NOW()
      AND o.ends_at>=NOW()
      AND (
        SELECT e.state
        FROM public.buildpulse_ad_payment_events e
        WHERE e.order_id=o.id
        ORDER BY e.observed_at DESC
        LIMIT 1
      )='confirmed'
      AND NOT EXISTS (
        SELECT 1 FROM public.buildpulse_ad_creatives c
        WHERE c.order_id=o.id AND c.review_state<>'approved'
      )
      AND (
        p.width_px IS NULL OR p.height_px IS NULL OR EXISTS (
          SELECT 1 FROM public.buildpulse_ad_creatives c
          WHERE c.order_id=o.id AND c.review_state='approved'
        )
      )
    FOR UPDATE OF o SKIP LOCKED
  )
  UPDATE public.buildpulse_ad_orders o
  SET status='active',updated_at=NOW()
  FROM eligible e
  WHERE o.id=e.id;
  GET DIAGNOSTICS activated_count = ROW_COUNT;

  UPDATE public.buildpulse_ad_orders
  SET status='completed',updated_at=NOW()
  WHERE status IN ('scheduled','active')
    AND ends_at<NOW();
  GET DIAGNOSTICS completed_count = ROW_COUNT;

  RETURN jsonb_build_object('ok',true,'activated',activated_count,'completed',completed_count,'ranAt',NOW());
END;
$$;

REVOKE ALL ON FUNCTION public.buildpulse_activate_ads() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buildpulse_activate_ads() TO service_role;
