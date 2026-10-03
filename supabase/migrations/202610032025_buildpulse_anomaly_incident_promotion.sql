create unique index if not exists idx_bp_incident_source_open on public.buildpulse_incidents(source,summary) where status in ('open','investigating','mitigated');
create or replace function public.buildpulse_promote_job_anomalies_to_incidents()
returns integer language plpgsql security definer set search_path=public as $$
declare n integer:=0;
begin
 insert into public.buildpulse_incidents(severity,status,source,summary,details,opened_at,updated_at)
 select case when j.status='failed' then 'high' else 'medium' end,'open','automation:'||j.job_name,
        case when j.status='failed' then 'Automation job failed: '||j.job_name else 'Automation job stale: '||j.job_name end,
        jsonb_build_object('job_name',j.job_name,'status',j.status,'error',j.error,'started_at',j.started_at,'metrics',j.metrics),
        coalesce(j.started_at,now()),now()
 from public.buildpulse_job_runs j
 where (j.status='failed' and j.started_at>=now()-interval '24 hours') or (j.status='running' and j.started_at<now()-interval '30 minutes')
 on conflict (source,summary) where status in ('open','investigating','mitigated') do update set details=excluded.details,updated_at=now();
 get diagnostics n=row_count;return n;
end $$;
revoke all on function public.buildpulse_promote_job_anomalies_to_incidents() from public,anon,authenticated;
grant execute on function public.buildpulse_promote_job_anomalies_to_incidents() to service_role;