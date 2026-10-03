-- Repair correlation in Social membership RLS. The prior unqualified predicate could compile as mine.conversation_id = mine.conversation_id.
drop policy if exists bp_social_members_member_read on public.buildpulse_social_members;
create policy bp_social_members_member_read on public.buildpulse_social_members
for select to authenticated
using (
 user_id=(select auth.uid())
 or exists(
  select 1 from public.buildpulse_social_members as mine
  where mine.conversation_id=buildpulse_social_members.conversation_id
    and mine.user_id=(select auth.uid())
 )
);
