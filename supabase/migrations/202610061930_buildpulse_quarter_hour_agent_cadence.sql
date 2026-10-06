alter table public.buildpulse_agent_schedules drop constraint if exists buildpulse_agent_schedules_cadence_check;
alter table public.buildpulse_agent_schedules add constraint buildpulse_agent_schedules_cadence_check check(cadence in ('quarter_hour','hourly','daily','weekly','manual'));
create or replace function public.buildpulse_claim_due_agent_schedules(p_limit integer default 30)
returns table(schedule_id uuid,agent_code text,input_template text,claim_token uuid)
language plpgsql security definer set search_path=public as $$
begin
 return query with due as (
  select s.id from public.buildpulse_agent_schedules s where s.enabled=true and s.cadence<>'manual' and coalesce(s.next_run_at,now())<=now() and (s.claimed_at is null or s.claimed_at<now()-interval '30 minutes')
  order by coalesce(s.next_run_at,now()) for update skip locked limit greatest(1,least(p_limit,50))
 ),claimed as (
  update public.buildpulse_agent_schedules s set claim_token=gen_random_uuid(),claimed_at=now(),last_run_at=now(),last_run_status='running',
  next_run_at=case s.cadence when 'quarter_hour' then now()+interval '15 minutes' when 'hourly' then now()+interval '1 hour' when 'daily' then now()+interval '1 day' when 'weekly' then now()+interval '7 days' else s.next_run_at end,updated_at=now()
  from due d where s.id=d.id returning s.id,s.agent_id,s.input_template,s.claim_token
 ) select c.id,a.code,c.input_template,c.claim_token from claimed c join public.buildpulse_agents a on a.id=c.agent_id where a.enabled=true;
end $$;
revoke all on function public.buildpulse_claim_due_agent_schedules(integer) from public,anon,authenticated;
grant execute on function public.buildpulse_claim_due_agent_schedules(integer) to service_role;
update public.buildpulse_agent_schedules s set cadence='quarter_hour',updated_at=now() from public.buildpulse_agents a where s.agent_id=a.id and s.name in ('rapid-newsroom','story-enrichment') and a.code in ('desk-world','desk-politics','desk-economy','desk-ai','desk-blockchain','desk-security','desk-sports','desk-science','desk-health','desk-culture','desk-life','breaking-news','source-freshness','news-dedupe','provenance-check','media-enrichment','seo-news','publication-health','story-reporter','story-editor','story-media-rights');