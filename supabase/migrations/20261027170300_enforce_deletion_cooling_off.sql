-- Browser clients cannot shorten the seven-day account-deletion cooling-off
-- period, backdate request/audit fields, or manipulate processing state.
-- Existing BuildPulse account deletion POST/DELETE route payloads are preserved.
CREATE OR REPLACE FUNCTION private.buildpulse_guard_deletion_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $guard$
DECLARE v_now timestamptz := pg_catalog.clock_timestamp();
BEGIN
 IF (SELECT auth.uid()) IS NULL OR coalesce(auth.jwt()->>'role','') <> 'authenticated' THEN
   RETURN NEW;
 END IF;
 IF TG_OP = 'INSERT' THEN
   IF NEW.user_id IS DISTINCT FROM (SELECT auth.uid()) OR NEW.status IS DISTINCT FROM 'pending' THEN
     RAISE EXCEPTION 'deletion_request_forbidden' USING ERRCODE = '42501';
   END IF;
   NEW.requested_at := v_now;
   NEW.eligible_at := v_now + interval '7 days';
   NEW.cancelled_at := NULL;
   NEW.completed_at := NULL;
   NEW.last_error := NULL;
   NEW.updated_at := v_now;
   RETURN NEW;
 END IF;
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
   RAISE EXCEPTION 'deletion_identity_immutable' USING ERRCODE = '42501';
 END IF;
 IF OLD.status = 'pending' AND NEW.status = 'cancelled' THEN
   NEW.requested_at := OLD.requested_at;
   NEW.eligible_at := OLD.eligible_at;
   NEW.cancelled_at := v_now;
   NEW.completed_at := OLD.completed_at;
   NEW.last_error := OLD.last_error;
   NEW.updated_at := v_now;
 ELSIF OLD.status IN ('cancelled','failed') AND NEW.status = 'pending' THEN
   NEW.requested_at := v_now;
   NEW.eligible_at := v_now + interval '7 days';
   NEW.cancelled_at := NULL;
   NEW.completed_at := NULL;
   NEW.last_error := NULL;
   NEW.updated_at := v_now;
 ELSE
   RAISE EXCEPTION 'deletion_transition_forbidden' USING ERRCODE = '42501';
 END IF;
 RETURN NEW;
END;
$guard$;
DROP TRIGGER IF EXISTS buildpulse_guard_deletion_request_timing
 ON public.buildpulse_account_deletion_requests;
CREATE TRIGGER buildpulse_guard_deletion_request_timing
BEFORE INSERT OR UPDATE ON public.buildpulse_account_deletion_requests
FOR EACH ROW EXECUTE FUNCTION private.buildpulse_guard_deletion_request();
REVOKE EXECUTE ON FUNCTION private.buildpulse_guard_deletion_request()
 FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS bp_account_deletion_own_restart
 ON public.buildpulse_account_deletion_requests;
CREATE POLICY bp_account_deletion_own_restart
ON public.buildpulse_account_deletion_requests
FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()) AND status IN ('cancelled','failed'))
WITH CHECK (user_id = (SELECT auth.uid()) AND status = 'pending');
