create table if not exists public.buildpulse_rate_limits(
 actor_id uuid not null references auth.users(id) on delete cascade,
 bucket text not null check(length(bucket) between 1 and 80),
 window_start timestamptz not null,
 count integer not null default 0 check(count>=0),
 updated_at timestamptz not null default now(),
 primary key(actor_id,bucket,window_start)
);
alter table public.buildpulse_rate_limits enable row level security;
revoke all on public.buildpulse_rate_limits from public,anon,authenticated;
grant all on public.buildpulse_rate_limits to service_role;

create or replace function public.buildpulse_consume_rate_limit(p_actor_id uuid,p_bucket text,p_limit integer,p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare v_start timestamptz; v_count integer;
begin
 if p_actor_id is null or p_bucket is null or length(p_bucket)<1 or length(p_bucket)>80 or p_limit<1 or p_limit>10000 or p_window_seconds<1 or p_window_seconds>604800 then raise exception 'invalid_rate_limit_parameters'; end if;
 v_start:=to_timestamp(floor(extract(epoch from clock_timestamp())/p_window_seconds)*p_window_seconds);
 insert into public.buildpulse_rate_limits(actor_id,bucket,window_start,count,updated_at) values(p_actor_id,p_bucket,v_start,1,now())
 on conflict(actor_id,bucket,window_start) do update set count=public.buildpulse_rate_limits.count+1,updated_at=now() where public.buildpulse_rate_limits.count<p_limit
 returning count into v_count;
 return v_count is not null and v_count<=p_limit;
end
$$;
revoke all on function public.buildpulse_consume_rate_limit(uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function public.buildpulse_consume_rate_limit(uuid,text,integer,integer) to service_role;
create index if not exists idx_buildpulse_rate_limits_cleanup on public.buildpulse_rate_limits(window_start);
