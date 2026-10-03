REVOKE ALL ON FUNCTION public.buildpulse_claim_due_agent_schedules(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.buildpulse_claim_due_agent_schedules(integer) FROM anon;
REVOKE ALL ON FUNCTION public.buildpulse_claim_due_agent_schedules(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.buildpulse_claim_due_agent_schedules(integer) TO service_role;

REVOKE ALL ON FUNCTION public.buildpulse_finish_agent_schedule(uuid,uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.buildpulse_finish_agent_schedule(uuid,uuid,text) FROM anon;
REVOKE ALL ON FUNCTION public.buildpulse_finish_agent_schedule(uuid,uuid,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.buildpulse_finish_agent_schedule(uuid,uuid,text) TO service_role;

COMMENT ON FUNCTION public.buildpulse_claim_due_agent_schedules(integer) IS
'Internal service-role scheduler claim function. Not executable through anon/authenticated Data API roles.';
COMMENT ON FUNCTION public.buildpulse_finish_agent_schedule(uuid,uuid,text) IS
'Internal service-role scheduler completion function. Not executable through anon/authenticated Data API roles.';
