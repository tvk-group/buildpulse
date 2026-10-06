create or replace function public.buildpulse_enqueue_due_agent_jobs(p_limit integer default 30)
returns table(schedule_id uuid,agent_code text,msg_id bigint)
language plpgsql security definer set search_path=public,pgmq as $$
declare r record;v_msg bigint;
begin
 for r in select * from public.buildpulse_claim_due_agent_schedules(greatest(1,least(coalesce(p_limit,30),50))) loop
  select x into v_msg from pgmq.send('buildpulse_agent_jobs',jsonb_build_object('schedule_id',r.schedule_id,'agent_code',r.agent_code,'input_template',r.input_template,'claim_token',r.claim_token,'enqueued_at',now())) x;
  schedule_id:=r.schedule_id;agent_code:=r.agent_code;msg_id:=v_msg;return next;
 end loop;
end $$;
revoke all on function public.buildpulse_enqueue_due_agent_jobs(integer) from public,anon,authenticated;
grant execute on function public.buildpulse_enqueue_due_agent_jobs(integer) to service_role;
create or replace function public.buildpulse_read_agent_jobs(p_qty integer default 5,p_visibility_seconds integer default 300)
returns table(msg_id bigint,read_ct integer,enqueued_at timestamptz,vt timestamptz,message jsonb)
language sql security definer set search_path=public,pgmq as $$
 select r.msg_id,r.read_ct,r.enqueued_at,r.vt,r.message from pgmq.read('buildpulse_agent_jobs',greatest(30,least(p_visibility_seconds,1800)),greatest(1,least(p_qty,10))) r
$$;
revoke all on function public.buildpulse_read_agent_jobs(integer,integer) from public,anon,authenticated;
grant execute on function public.buildpulse_read_agent_jobs(integer,integer) to service_role;
create or replace function public.buildpulse_archive_agent_job(p_msg_id bigint)
returns boolean language sql security definer set search_path=public,pgmq as $$select pgmq.archive('buildpulse_agent_jobs',p_msg_id)$$;
revoke all on function public.buildpulse_archive_agent_job(bigint) from public,anon,authenticated;
grant execute on function public.buildpulse_archive_agent_job(bigint) to service_role;
create or replace function public.buildpulse_queue_metrics()
returns table(queue_name text,queue_length bigint,queue_visible_length bigint,newest_msg_age_sec integer,oldest_msg_age_sec integer,total_messages bigint)
language sql security definer set search_path=public,pgmq as $$
 select m.queue_name,m.queue_length,m.queue_visible_length,m.newest_msg_age_sec,m.oldest_msg_age_sec,m.total_messages from pgmq.metrics_all() m where m.queue_name like 'buildpulse_%'
$$;
revoke all on function public.buildpulse_queue_metrics() from public,anon,authenticated;
grant execute on function public.buildpulse_queue_metrics() to service_role;