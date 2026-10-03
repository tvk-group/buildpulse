create policy bp_social_members_manager_insert on public.buildpulse_social_members
for insert to authenticated with check(
 exists(
  select 1 from public.buildpulse_social_members mine
  join public.buildpulse_social_conversations c on c.id=mine.conversation_id
  where mine.conversation_id=buildpulse_social_members.conversation_id
   and mine.user_id=(select auth.uid())
   and mine.role in ('owner','moderator')
   and c.kind in ('group','channel')
 )
);
