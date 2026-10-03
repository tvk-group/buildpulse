-- Preserve Social conversation owner integrity and prevent moderator privilege escalation.
create or replace function public.buildpulse_social_add_member(p_conversation uuid,p_handle text,p_role text default 'member')
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=(select auth.uid()); target uuid; k text; actor_role text;
begin
 if uid is null then raise exception 'auth_required'; end if;
 if p_role not in ('member','moderator') then raise exception 'invalid_role'; end if;
 select c.kind,m.role into k,actor_role
 from public.buildpulse_social_conversations c
 join public.buildpulse_social_members m on m.conversation_id=c.id
 where c.id=p_conversation and m.user_id=uid and m.role in ('owner','moderator');
 if k is null or k='direct' then raise exception 'not_allowed'; end if;
 if p_role='moderator' and actor_role<>'owner' then raise exception 'owner_required_for_moderator'; end if;
 select user_id into target from public.buildpulse_social_profiles where lower(handle)=lower(trim(p_handle)) and discoverable=true;
 if target is null or target=uid then raise exception 'profile_not_found'; end if;
 insert into public.buildpulse_social_members(conversation_id,user_id,role)
 values(p_conversation,target,p_role)
 on conflict(conversation_id,user_id) do nothing;
end $$;
revoke all on function public.buildpulse_social_add_member(uuid,text,text) from public,anon;
grant execute on function public.buildpulse_social_add_member(uuid,text,text) to authenticated;
