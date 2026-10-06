-- Durable BuildPulse worker queues. Keep queue access server-side.
create extension if not exists pgmq;
select pgmq.create('buildpulse_agent_jobs') where not exists(select 1 from pgmq.meta where queue_name='buildpulse_agent_jobs');
select pgmq.create('buildpulse_story_enrichment') where not exists(select 1 from pgmq.meta where queue_name='buildpulse_story_enrichment');
select pgmq.create('buildpulse_machine_review') where not exists(select 1 from pgmq.meta where queue_name='buildpulse_machine_review');
