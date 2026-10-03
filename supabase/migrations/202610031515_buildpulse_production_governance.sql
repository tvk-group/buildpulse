-- Reproduce BuildPulse production governance added 2026-10-03.
do $$ begin
 if not exists(select 1 from pg_constraint where conname='buildpulse_verified_provenance_required' and conrelid='public.buildpulse_stories'::regclass) then
  alter table public.buildpulse_stories add constraint buildpulse_verified_provenance_required check(verification_state<>'verified' or (verified_at is not null and nullif(btrim(verified_by),'') is not null and nullif(btrim(canonical_source_url),'') is not null and canonical_source_url ~ '^https://')) not valid;
  alter table public.buildpulse_stories validate constraint buildpulse_verified_provenance_required;
 end if;
 if not exists(select 1 from pg_constraint where conname='buildpulse_publication_requires_verification' and conrelid='public.buildpulse_stories'::regclass) then
  alter table public.buildpulse_stories add constraint buildpulse_publication_requires_verification check(publication_state='withheld' or (verification_state='verified' and verified_at is not null and nullif(btrim(verified_by),'') is not null and nullif(btrim(canonical_source_url),'') is not null and canonical_source_url ~ '^https://')) not valid;
  alter table public.buildpulse_stories validate constraint buildpulse_publication_requires_verification;
 end if;
end $$;

insert into public.buildpulse_ai_budgets(task,daily_token_limit,daily_request_limit,enabled) values
('news_draft',300000,120,true),('localize',400000,240,true),('summarize',200000,200,true),
('moderation_triage',200000,240,true),('finance_reconcile',100000,80,true),('seo',150000,120,true),('ops',150000,120,true)
on conflict(task) do nothing;

drop policy if exists contributor_quote_owner_read on public.buildpulse_contributor_payment_quotes;
create policy contributor_quote_owner_read on public.buildpulse_contributor_payment_quotes for select to authenticated
using(exists(select 1 from public.buildpulse_contributor_submissions s where s.id=buildpulse_contributor_payment_quotes.submission_id and s.user_id=(select auth.uid())));
drop policy if exists "buildpulse_intelligence_subscriptions_own_read" on public.buildpulse_intelligence_subscriptions;

do $$ begin
 if exists(select 1 from cron.job where jobname='buildpulse-editions-db') then perform cron.unschedule('buildpulse-editions-db'); end if;
end $$;
select cron.schedule('buildpulse-editions-db','15 5 * * *', $cron$
 select net.http_post(
  url := 'https://jdgddwutqypxxvfvkypw.supabase.co/functions/v1/buildpulse-editions-scheduled',
  headers := jsonb_build_object('Content-Type','application/json','x-buildpulse-scheduler-secret',(select value from public.buildpulse_private_settings where key='agent_scheduler_secret')),
  body := '{}'::jsonb
 );
$cron$);