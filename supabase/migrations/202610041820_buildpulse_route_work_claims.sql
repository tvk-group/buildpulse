create or replace function public.buildpulse_claim_route_work(p_limit integer default 10)
returns setof public.buildpulse_route_work_items
language plpgsql security definer set search_path=public as $$
declare v_token uuid:=gen_random_uuid();
begin
 return query
 with picked as (
  select id from public.buildpulse_route_work_items
  where status='queued'
  order by priority desc,created_at asc
  for update skip locked
  limit greatest(1,least(coalesce(p_limit,10),50))
 ), updated as (
  update public.buildpulse_route_work_items w
  set status='claimed',claim_token=v_token,claimed_at=now(),attempts=attempts+1,updated_at=now()
  from picked where w.id=picked.id
  returning w.*
 )
 select * from updated;
end $$;

create or replace function public.buildpulse_finish_route_work(p_work_id uuid,p_claim_token uuid,p_status text,p_error text default null)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_ok boolean:=false;
begin
 if p_status not in ('completed','failed','awaiting_approval','cancelled') then raise exception 'invalid route work status'; end if;
 update public.buildpulse_route_work_items
 set status=p_status,finished_at=case when p_status in ('completed','failed','cancelled') then now() else null end,last_error=left(p_error,2000),updated_at=now()
 where id=p_work_id and claim_token=p_claim_token and status='claimed';
 v_ok:=found;
 return v_ok;
end $$;
revoke all on function public.buildpulse_claim_route_work(integer) from public,anon,authenticated;
revoke all on function public.buildpulse_finish_route_work(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.buildpulse_claim_route_work(integer) to service_role;
grant execute on function public.buildpulse_finish_route_work(uuid,uuid,text,text) to service_role;