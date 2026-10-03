-- Move privileged Social authorization helpers out of the exposed public schema and remove recursive/bypass-prone membership INSERT policies.
create schema if not exists private;
revoke all on schema private from public,anon;
grant usage on schema private to authenticated;

create or replace function private.buildpulse_social_member_role(p_conversation uuid)
returns text language sql security definer stable set search_path='' as $$
 select m.role from public.buildpulse_social_members m where m.conversation_id=p_conversation and m.user_id=(select auth.uid()) limit 1
$$;
revoke all on function private.buildpulse_social_member_role(uuid) from public,anon;
grant execute on function private.buildpulse_social_member_role(uuid) to authenticated;

drop policy if exists bp_social_conversations_member_read on public.buildpulse_social_conversations;
create policy bp_social_conversations_member_read on public.buildpulse_social_conversations for select to authenticated using(created_by=(select auth.uid()) or (select private.buildpulse_social_member_role(id)) is not null);
drop policy if exists bp_social_conversations_owner_update on public.buildpulse_social_conversations;
create policy bp_social_conversations_owner_update on public.buildpulse_social_conversations for update to authenticated using(created_by=(select auth.uid()) or (select private.buildpulse_social_member_role(id))='owner') with check(created_by=(select auth.uid()) or (select private.buildpulse_social_member_role(id))='owner');
drop policy if exists bp_social_members_member_read on public.buildpulse_social_members;
create policy bp_social_members_member_read on public.buildpulse_social_members for select to authenticated using(user_id=(select auth.uid()) or (select private.buildpulse_social_member_role(conversation_id)) is not null);
drop policy if exists bp_social_messages_member_read on public.buildpulse_social_messages;
create policy bp_social_messages_member_read on public.buildpulse_social_messages for select to authenticated using((select private.buildpulse_social_member_role(conversation_id)) is not null);
drop policy if exists bp_social_messages_member_insert on public.buildpulse_social_messages;
create policy bp_social_messages_member_insert on public.buildpulse_social_messages for insert to authenticated with check(sender_id=(select auth.uid()) and (select private.buildpulse_social_member_role(conversation_id)) is not null);
drop policy if exists bp_social_members_manager_insert on public.buildpulse_social_members;
drop policy if exists bp_social_members_direct_creator_peer_insert on public.buildpulse_social_members;

create or replace function private.buildpulse_social_create_conversation_impl(p_kind text,p_title text,p_member_handles text[] default '{}')
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); cid uuid; h text; target uuid; allow_mode text; is_follower boolean; member_count int:=coalesce(array_length(p_member_handles,1),0); recent_count int;
begin
 if uid is null then raise exception 'auth_required'; end if;
 if p_kind not in ('direct','group','channel') then raise exception 'invalid_kind'; end if;
 if member_count>50 then raise exception 'too_many_members'; end if;
 if p_kind='direct' and member_count<>1 then raise exception 'direct_requires_one_peer'; end if;
 if p_kind<>'direct' and (p_title is null or char_length(trim(p_title))<2 or char_length(trim(p_title))>120) then raise exception 'title_required'; end if;
 select count(*) into recent_count from public.buildpulse_social_conversations where created_by=uid and created_at>=now()-interval '10 minutes';
 if recent_count>=10 then raise exception 'conversation_rate_limited'; end if;
 insert into public.buildpulse_social_conversations(kind,title,created_by) values(p_kind,case when p_kind='direct' then null else trim(p_title) end,uid) returning id into cid;
 insert into public.buildpulse_social_members(conversation_id,user_id,role) values(cid,uid,'owner');
 foreach h in array p_member_handles loop
  select user_id,allow_messages into target,allow_mode from public.buildpulse_social_profiles where lower(handle)=lower(trim(h)) and discoverable=true;
  if target is null or target=uid then raise exception 'invalid_member'; end if;
  if p_kind='direct' then
   if allow_mode='nobody' then raise exception 'messages_not_allowed'; end if;
   if allow_mode='followers' then select exists(select 1 from public.buildpulse_social_follows where follower_id=uid and following_id=target) into is_follower; if not is_follower then raise exception 'messages_followers_only'; end if;
  end if;
  insert into public.buildpulse_social_members(conversation_id,user_id,role) values(cid,target,'member') on conflict do nothing;
 end loop;
 return cid;
end $$;
revoke all on function private.buildpulse_social_create_conversation_impl(text,text,text[]) from public,anon;
grant execute on function private.buildpulse_social_create_conversation_impl(text,text,text[]) to authenticated;

create or replace function private.buildpulse_social_add_member_impl(p_conversation uuid,p_handle text,p_role text default 'member')
returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); target uuid; k text; actor_role text;
begin
 if uid is null then raise exception 'auth_required'; end if;
 if p_role not in ('member','moderator') then raise exception 'invalid_role'; end if;
 select c.kind,m.role into k,actor_role from public.buildpulse_social_conversations c join public.buildpulse_social_members m on m.conversation_id=c.id where c.id=p_conversation and m.user_id=uid and m.role in ('owner','moderator');
 if k is null or k='direct' then raise exception 'not_allowed'; end if;
 if p_role='moderator' and actor_role<>'owner' then raise exception 'owner_required_for_moderator'; end if;
 select user_id into target from public.buildpulse_social_profiles where lower(handle)=lower(trim(p_handle)) and discoverable=true;
 if target is null or target=uid then raise exception 'profile_not_found'; end if;
 insert into public.buildpulse_social_members(conversation_id,user_id,role) values(p_conversation,target,p_role) on conflict(conversation_id,user_id) do nothing;
end $$;
revoke all on function private.buildpulse_social_add_member_impl(uuid,text,text) from public,anon;
grant execute on function private.buildpulse_social_add_member_impl(uuid,text,text) to authenticated;

create or replace function public.buildpulse_social_create_conversation(p_kind text,p_title text,p_member_handles text[] default '{}')
returns uuid language sql security invoker set search_path='' as $$ select private.buildpulse_social_create_conversation_impl(p_kind,p_title,p_member_handles) $$;
revoke all on function public.buildpulse_social_create_conversation(text,text,text[]) from public,anon;
grant execute on function public.buildpulse_social_create_conversation(text,text,text[]) to authenticated;
create or replace function public.buildpulse_social_add_member(p_conversation uuid,p_handle text,p_role text default 'member')
returns void language sql security invoker set search_path='' as $$ select private.buildpulse_social_add_member_impl(p_conversation,p_handle,p_role) $$;
revoke all on function public.buildpulse_social_add_member(uuid,text,text) from public,anon;
grant execute on function public.buildpulse_social_add_member(uuid,text,text) to authenticated;
