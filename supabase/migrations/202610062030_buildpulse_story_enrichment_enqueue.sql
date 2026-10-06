create or replace function public.buildpulse_enqueue_story_enrichment(p_limit integer default 25)
returns integer language plpgsql security definer set search_path=public,pgmq as $$
declare r record;n integer:=0;
begin
 for r in select s.id,s.title,s.summary,s.category,s.canonical_source_url,s.image_url,s.published_at from public.buildpulse_stories s
 where s.verification_state='verified' and coalesce(s.publication_state,'')<>'withheld'
 and not exists(select 1 from public.buildpulse_story_articles a where a.story_id=s.id)
 order by s.published_at desc nulls last limit greatest(1,least(coalesce(p_limit,25),100))
 loop
  perform pgmq.send('buildpulse_story_enrichment',jsonb_build_object('story_id',r.id,'title',r.title,'summary',r.summary,'category',r.category,'canonical_source_url',r.canonical_source_url,'image_url',r.image_url,'published_at',r.published_at,'enqueued_at',now()));n:=n+1;
 end loop;return n;
end $$;
revoke all on function public.buildpulse_enqueue_story_enrichment(integer) from public,anon,authenticated;
grant execute on function public.buildpulse_enqueue_story_enrichment(integer) to service_role;