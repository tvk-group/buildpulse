-- Queue deterministic specialized route audits across the complete BuildPulse route inventory.
-- These are evidence-producing work items only. They never publish or deploy automatically.

create or replace function public.buildpulse_queue_specialized_route_audits(p_limit integer default 120)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  queued_count integer:=0;
begin
  with route_kinds as (
    select
      r.id as route_id,
      k.kind,
      case
        when r.risk_level in ('critical','high') then 85
        when r.risk_level='medium' then 70
        else 55
      end
      + case k.kind when 'integration' then 4 when 'accessibility' then 3 when 'seo' then 2 else 1 end as priority,
      jsonb_build_object(
        'route',r.route,
        'sourcePath',r.source_path,
        'surface',r.surface,
        'riskLevel',r.risk_level,
        'lastStatus',r.last_status,
        'existingFindings',r.findings,
        'auditKind',k.kind,
        'requirements',
          case k.kind
            when 'localization' then jsonb_build_array(
              'Detect user-visible strings that bypass the BuildPulse locale dictionary',
              'Do not claim a translation exists unless explicit localized copy is present',
              'Preserve the supported 25-locale contract and RTL-safe behavior'
            )
            when 'seo' then jsonb_build_array(
              'Check indexability policy for this surface',
              'Check canonical and metadata coverage without exposing private routes',
              'Check structured-data applicability and owned URL consistency'
            )
            when 'accessibility' then jsonb_build_array(
              'Check semantic heading and landmark structure',
              'Check interactive control names, keyboard reachability and form labels',
              'Check image alternative-text policy and status/error announcement semantics'
            )
            else jsonb_build_array(
              'Check same-origin and external integration boundaries',
              'Check authentication/authorization and fail-closed behavior where applicable',
              'Check that unavailable providers are not represented as active'
            )
          end
      ) as finding
    from public.buildpulse_route_inventory r
    cross join (values ('localization'),('seo'),('accessibility'),('integration')) as k(kind)
    where r.enabled
      and not exists (
        select 1
        from public.buildpulse_route_work_items w
        where w.route_id=r.id
          and w.kind=k.kind
          and w.status in ('queued','claimed','awaiting_approval')
      )
    order by
      case r.risk_level when 'critical' then 4 when 'high' then 3 when 'medium' then 2 else 1 end desc,
      r.updated_at asc,
      case k.kind when 'integration' then 1 when 'accessibility' then 2 when 'seo' then 3 else 4 end
    limit greatest(1,least(coalesce(p_limit,120),268))
  ), inserted as (
    insert into public.buildpulse_route_work_items(route_id,kind,priority,finding)
    select route_id,kind,least(priority,100),finding from route_kinds
    on conflict do nothing
    returning 1
  )
  select count(*) into queued_count from inserted;

  return queued_count;
end
$$;

revoke all on function public.buildpulse_queue_specialized_route_audits(integer) from public,anon,authenticated;
grant execute on function public.buildpulse_queue_specialized_route_audits(integer) to service_role;

comment on function public.buildpulse_queue_specialized_route_audits(integer) is
'Queues bounded localization, SEO, accessibility and integration audits for enabled BuildPulse routes without duplicating active work.';
