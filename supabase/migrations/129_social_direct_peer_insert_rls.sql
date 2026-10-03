create policy bp_social_members_direct_creator_peer_insert on public.buildpulse_social_members
for insert to authenticated with check(
 user_id<>(select auth.uid()) and role='member'
 and exists(select 1 from public.buildpulse_social_conversations c where c.id=buildpulse_social_members.conversation_id and c.created_by=(select auth.uid()) and c.kind='direct')
);
