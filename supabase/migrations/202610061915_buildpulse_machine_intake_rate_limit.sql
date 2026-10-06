create table if not exists public.buildpulse_machine_intake_limits(
 fingerprint text not null,window_start timestamptz not null,request_count integer not null default 1 check(request_count>=0),updated_at timestamptz not null default now(),primary key(fingerprint,window_start)
);
alter table public.buildpulse_machine_intake_limits enable row level security;
revoke all on public.buildpulse_machine_intake_limits from anon,authenticated;
grant all on public.buildpulse_machine_intake_limits to service_role;
create or replace function public.buildpulse_claim_machine_intake(p_fingerprint text,p_limit integer default 5,p_window_minutes integer default 60)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_window timestamptz;v_count integer;
begin
 if p_fingerprint is null or length(p_fingerprint)<16 then return false;end if;
 v_window:=to_timestamp(floor(extract(epoch from now())/(greatest(1,p_window_minutes)*60))*(greatest(1,p_window_minutes)*60));
 insert into public.buildpulse_machine_intake_limits(fingerprint,window_start,request_count) values(p_fingerprint,v_window,1)
 on conflict(fingerprint,window_start) do update set request_count=public.buildpulse_machine_intake_limits.request_count+1,updated_at=now()
 returning request_count into v_count;
 return v_count<=greatest(1,least(p_limit,50));
end $$;
revoke all on function public.buildpulse_claim_machine_intake(text,integer,integer) from public,anon,authenticated;
grant execute on function public.buildpulse_claim_machine_intake(text,integer,integer) to service_role;