-- Prevent authenticated users from joining arbitrary Social conversations by guessing a conversation UUID.
drop policy if exists bp_social_members_self_insert on public.buildpulse_social_members;
drop policy if exists bp_social_members_creator_self_insert on public.buildpulse_social_members;
create policy bp_social_members_creator_self_insert on public.buildpulse_social_members
for insert to authenticated
with check (
 user_id=(select auth.uid())
 and exists(
  select 1 from public.buildpulse_social_conversations c
  where c.id=buildpulse_social_members.conversation_id
    and c.created_by=(select auth.uid())
 )
);
