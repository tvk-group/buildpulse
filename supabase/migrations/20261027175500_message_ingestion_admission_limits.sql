-- Force consistent social-message limits for the authenticated HTTP route
-- AND for direct Supabase Data API INSERTs, without disabling message sending.
-- Advisory transaction locks serialize a user's concurrent sends. This makes
-- the sliding-window count a transactional admission control check.
CREATE OR REPLACE FUNCTION private.buildpulse_guard_message_intake()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $guard$
DECLARE
 actor uuid := (SELECT auth.uid());
 received_at timestamptz := pg_catalog.clock_timestamp();
 recent_count integer;
BEGIN
 IF actor IS NULL OR coalesce(auth.jwt()->>'role','') <> 'authenticated' THEN
   RETURN NEW;
 END IF;
 IF NEW.sender_id IS DISTINCT FROM actor THEN
   RAISE EXCEPTION 'message_sender_forbidden' USING ERRCODE='42501';
 END IF;
 IF pg_catalog.char_length(coalesce(NEW.ciphertext,'')) NOT BETWEEN 8 AND 100000
    OR pg_catalog.char_length(coalesce(NEW.nonce,'')) NOT BETWEEN 8 AND 1000
    OR pg_catalog.char_length(coalesce(NEW.client_message_id,'')) NOT BETWEEN 8 AND 200
    OR NEW.key_version NOT BETWEEN 1 AND 100000 THEN
   RAISE EXCEPTION 'invalid_ciphertext_message' USING ERRCODE='22023';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended(actor::text, 6666625529));
 received_at := pg_catalog.clock_timestamp();
 SELECT count(*) INTO recent_count
 FROM public.buildpulse_social_messages AS message
 WHERE message.sender_id=actor
  AND message.created_at > received_at - interval '1 minute';
 IF recent_count >= 30 THEN
   RAISE EXCEPTION 'message_rate_limited' USING ERRCODE='P0001';
 END IF;
 NEW.created_at := received_at;
 RETURN NEW;
END;
$guard$;
DROP TRIGGER IF EXISTS buildpulse_guard_message_intake ON public.buildpulse_social_messages;
CREATE TRIGGER buildpulse_guard_message_intake
BEFORE INSERT ON public.buildpulse_social_messages
FOR EACH ROW EXECUTE FUNCTION private.buildpulse_guard_message_intake();
REVOKE EXECUTE ON FUNCTION private.buildpulse_guard_message_intake()
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.buildpulse_guard_message_intake()
 TO postgres, service_role;
