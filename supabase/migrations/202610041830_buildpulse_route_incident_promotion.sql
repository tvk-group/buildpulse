-- Extend incident refresh with evidence-backed high/critical route failures.
-- Dependency-blocked routes are deliberately excluded: blocked QA is not an outage.
create or replace function public.buildpulse_promote_route_failures_to_incidents()
returns integer language plpgsql security definer set search_path=public as $$
declare n integer:=0;
begin
 insert into public.buildpulse_incidents(severity,status,source,summary,details,opened_at,updated_at)
 select case when r.risk_level='critical' then 'critical' else 'high' end,
        'open','route:'||r.route,'Production route requires attention: '||r.route,
        jsonb_build_object('route',r.route,'surface',r.surface,'risk_level',r.risk_level,'last_status',r.last_status,'findings',r.findings,'last_audited_at',r.last_audited_at),
        coalesce(r.last_audited_at,now()),now()
 from public.buildpulse_route_inventory r
 where r.enabled and r.risk_level in ('critical','high') and r.last_status in ('failed','incomplete')
 on conflict (source,summary) where status in ('open','investigating','mitigated')
 do update set details=excluded.details,severity=excluded.severity,updated_at=now();
 get diagnostics n=row_count;
 update public.buildpulse_incidents i set status='resolved',resolved_at=now(),updated_at=now()
 where i.status in ('open','investigating','mitigated') and i.source like 'route:%'
 and exists(select 1 from public.buildpulse_route_inventory r where 'route:'||r.route=i.source and r.last_status='healthy');
 return n;
end $$;
revoke all on function public.buildpulse_promote_route_failures_to_incidents() from public,anon,authenticated;
grant execute on function public.buildpulse_promote_route_failures_to_incidents() to service_role;

create or replace function public.buildpulse_refresh_incidents()
returns integer language plpgsql security definer set search_path=public as $$
declare n integer:=0;
begin
 n:=n+public.buildpulse_promote_job_anomalies_to_incidents();
 n:=n+public.buildpulse_promote_route_failures_to_incidents();
 return n;
end $$;
revoke all on function public.buildpulse_refresh_incidents() from public,anon,authenticated;
grant execute on function public.buildpulse_refresh_incidents() to service_role;
