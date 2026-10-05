create or replace function public.buildpulse_requeue_stale_route_work(p_stale_minutes integer default 30,p_max_attempts integer default 3)
returns table(requeued integer,failed integer)
language plpgsql security definer set search_path=public as $$
declare v_requeued integer:=0; v_failed integer:=0; v_stale interval;
begin
 v_stale:=make_interval(mins=>greatest(5,least(coalesce(p_stale_minutes,30),1440)));
 with u as (
  update public.buildpulse_route_work_items
  set status='failed',finished_at=now(),claim_token=null,last_error='stale_claim_attempt_limit',updated_at=now()
  where status='claimed' and claimed_at<now()-v_stale and attempts>=greatest(1,least(coalesce(p_max_attempts,3),10))
  returning 1
 ) select count(*) into v_failed from u;
 with u as (
  update public.buildpulse_route_work_items
  set status='queued',claim_token=null,claimed_at=null,last_error='stale_claim_requeued',updated_at=now()
  where status='claimed' and claimed_at<now()-v_stale and attempts<greatest(1,least(coalesce(p_max_attempts,3),10))
  returning 1
 ) select count(*) into v_requeued from u;
 return query select v_requeued,v_failed;
end $$;
revoke all on function public.buildpulse_requeue_stale_route_work(integer,integer) from public,anon,authenticated;
grant execute on function public.buildpulse_requeue_stale_route_work(integer,integer) to service_role;
