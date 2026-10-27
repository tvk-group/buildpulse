-- Account deletion audit events are exclusively server-controlled.
-- No browser RLS policies exist; revoke legacy direct database privileges.
REVOKE ALL PRIVILEGES ON TABLE public.buildpulse_account_deletion_audit FROM anon, authenticated;
