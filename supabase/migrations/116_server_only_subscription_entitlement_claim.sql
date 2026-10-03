-- Keep entitlement claiming behind the trusted Next.js server boundary.
CREATE OR REPLACE FUNCTION public.buildpulse_claim_own_subscriptions_for_user(p_user_id uuid,p_email text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE claimed integer; clean_email text;
BEGIN
 IF p_user_id IS NULL THEN RAISE EXCEPTION 'user_required'; END IF;
 clean_email:=lower(trim(coalesce(p_email,'')));
 IF clean_email='' THEN RAISE EXCEPTION 'email_required'; END IF;
 UPDATE public.buildpulse_intelligence_subscriptions SET user_id=p_user_id,updated_at=now()
 WHERE user_id IS NULL AND lower(email)=clean_email;
 GET DIAGNOSTICS claimed=ROW_COUNT;
 RETURN claimed;
END $$;
REVOKE ALL ON FUNCTION public.buildpulse_claim_own_subscriptions_for_user(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.buildpulse_claim_own_subscriptions_for_user(uuid,text) TO service_role;
REVOKE ALL ON FUNCTION public.buildpulse_claim_own_subscriptions() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.buildpulse_claim_own_subscriptions() TO service_role;
COMMENT ON FUNCTION public.buildpulse_claim_own_subscriptions_for_user(uuid,text) IS 'Server-only subscription entitlement claim after application auth.getUser verification.';
