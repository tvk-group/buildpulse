-- Idempotent service-period subscription revenue recognition.
-- Revenue is released from 2100 to 4000 only from immutable Stripe service-period evidence.
create or replace function public.buildpulse_recognize_subscription_revenue(p_document_id uuid,p_through_date date default current_date)
returns uuid language plpgsql security definer set search_path=public as $$
declare d public.buildpulse_accounting_documents%rowtype;e public.buildpulse_accounting_entities%rowtype;period_start date;period_end date;effective_end date;total_days integer;earned_days integer;target numeric(20,6);already numeric(20,6);delta numeric(20,6);jid uuid;source_key text;
begin
 select * into d from public.buildpulse_accounting_documents where id=p_document_id for update;
 if not found or d.status<>'paid' or d.stripe_subscription_id is null then return null;end if;
 select * into e from public.buildpulse_accounting_entities where id=d.entity_id;
 if upper(d.currency)<>upper(e.base_currency) then return null;end if;
 select min((x->>'period_start')::timestamptz::date),max((x->>'period_end')::timestamptz::date) into period_start,period_end from jsonb_array_elements(d.immutable_snapshot->'service_periods') x where x ? 'period_start' and x ? 'period_end';
 if period_start is null or period_end is null or period_end<=period_start then return null;end if;
 effective_end:=least(greatest(p_through_date+1,period_start),period_end);total_days:=period_end-period_start;earned_days:=effective_end-period_start;
 target:=round(d.net_amount*(earned_days::numeric/total_days::numeric),6);if effective_end>=period_end then target:=d.net_amount;end if;
 select coalesce(sum(l.credit-l.debit),0) into already from public.buildpulse_journal_entries j join public.buildpulse_journal_lines l on l.entry_id=j.id where j.entity_id=d.entity_id and j.source_type='subscription_revenue_recognition' and j.source_id like d.id::text||':%' and l.account_code='4000' and j.status='posted';
 delta:=round(target-already,6);if delta<=0 then return null;end if;if already+delta>d.net_amount+0.000001 then raise exception 'recognition exceeds deferred revenue';end if;
 source_key:=d.id::text||':'||effective_end::text;
 insert into public.buildpulse_journal_entries(entity_id,entry_date,source_type,source_id,description,currency,fx_rate_to_base,status) values(d.entity_id,effective_end-1,'subscription_revenue_recognition',source_key,'Subscription revenue recognition '||d.document_number,upper(d.currency),1,'posted') on conflict(entity_id,source_type,source_id) do nothing returning id into jid;
 if jid is null then return null;end if;
 insert into public.buildpulse_journal_lines(entry_id,account_code,debit,credit,metadata) values(jid,'2100',delta,0,jsonb_build_object('document_id',d.id,'through_date',effective_end-1,'service_period_start',period_start,'service_period_end',period_end)),(jid,'4000',0,delta,jsonb_build_object('document_id',d.id,'through_date',effective_end-1,'service_period_start',period_start,'service_period_end',period_end));
 return jid;
end $$;
revoke all on function public.buildpulse_recognize_subscription_revenue(uuid,date) from public,anon,authenticated;grant execute on function public.buildpulse_recognize_subscription_revenue(uuid,date) to service_role;

create or replace function public.buildpulse_recognize_due_subscription_revenue(p_through_date date default current_date,p_limit integer default 100)
returns integer language plpgsql security definer set search_path=public as $$
declare r record;n integer:=0;j uuid;
begin
 if p_limit<1 or p_limit>500 then raise exception 'limit out of range';end if;
 for r in select d.id from public.buildpulse_accounting_documents d join public.buildpulse_accounting_entities e on e.id=d.entity_id where d.status='paid' and d.stripe_subscription_id is not null and upper(d.currency)=upper(e.base_currency) and jsonb_typeof(d.immutable_snapshot->'service_periods')='array' and jsonb_array_length(d.immutable_snapshot->'service_periods')>0 order by d.paid_at nulls last,d.id limit p_limit loop j:=public.buildpulse_recognize_subscription_revenue(r.id,p_through_date);if j is not null then n:=n+1;end if;end loop;
 return n;
end $$;
revoke all on function public.buildpulse_recognize_due_subscription_revenue(date,integer) from public,anon,authenticated;grant execute on function public.buildpulse_recognize_due_subscription_revenue(date,integer) to service_role;

do $$ begin
 if exists(select 1 from cron.job where jobname='buildpulse-subscription-revenue-recognition') then perform cron.unschedule((select jobid from cron.job where jobname='buildpulse-subscription-revenue-recognition' limit 1));end if;
 perform cron.schedule('buildpulse-subscription-revenue-recognition','25 2 * * *',$job$select public.buildpulse_recognize_due_subscription_revenue(current_date,100);$job$);
end $$;