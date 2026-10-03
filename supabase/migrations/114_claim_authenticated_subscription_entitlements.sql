-- Safely bind Stripe-created subscription entitlements to the authenticated BuildPulse account.
DROP POLICY IF EXISTS buildpulse_intelligence_subscriptions_own_read ON public.buildpulse_intelligence_subscriptions;
CREATE POLICY buildpulse_intelligence_subscriptions_own_read ON public.buildpulse_intelligence_subscriptions
FOR SELECT TO authenticated USING (user_id=(select auth.uid()));

CREATE OR REPLACE FUNCTION public.buildpulse_claim_own_subscriptions()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid; jwt_email text; claimed integer;
BEGIN
  uid:=auth.uid();
  jwt_email:=lower(trim(coalesce(auth.jwt()->>'email','')));
  IF uid IS NULL OR jwt_email='' THEN RAISE EXCEPTION 'authenticated_email_required'; END IF;
  UPDATE public.buildpulse_intelligence_subscriptions
  SET user_id=uid,updated_at=now()
  WHERE user_id IS NULL AND lower(email)=jwt_email;
  GET DIAGNOSTICS claimed=ROW_COUNT;
  RETURN claimed;
END $$;
REVOKE ALL ON FUNCTION public.buildpulse_claim_own_subscriptions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buildpulse_claim_own_subscriptions() TO authenticated;
GRANT SELECT ON public.buildpulse_intelligence_subscriptions TO authenticated;
