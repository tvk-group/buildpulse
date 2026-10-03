-- Auth session inventory for the signed-in user. Returns only the caller's sessions and never exposes refresh-token material.
create or replace function public.buildpulse_list_own_sessions()
returns table(session_id uuid,created_at timestamptz,updated_at timestamptz,refreshed_at timestamp,user_agent text,ip text,aal text,not_after timestamptz,is_current boolean)
language sql security definer set search_path=public,auth,pg_temp stable as $$
 select s.id,s.created_at,s.updated_at,s.refreshed_at,s.user_agent,host(s.ip),s.aal::text,s.not_after,
        s.id=case when coalesce(auth.jwt()->>'session_id','') ~* '^[0-9a-f-]{36}$' then (auth.jwt()->>'session_id')::uuid else null end
 from auth.sessions s
 where s.user_id=(select auth.uid())
 order by coalesce(s.refreshed_at,s.updated_at::timestamp) desc
 limit 50
$$;
revoke all on function public.buildpulse_list_own_sessions() from public,anon;
grant execute on function public.buildpulse_list_own_sessions() to authenticated;
