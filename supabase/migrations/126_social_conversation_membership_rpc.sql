create or replace function public.buildpulse_social_create_conversation(p_kind text,p_title text,p_member_handles text[] default '{}')
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=(select auth.uid()); cid uuid; h text; target uuid; allow_mode text; is_follower boolean;
begin
 if uid is null then raise exception 'auth_required'; end if;
 if p_kind not in ('direct','group','channel') then raise exception 'invalid_kind'; end if;
 if p_kind='direct' and coalesce(array_length(p_member_handles,1),0)<>1 then raise exception 'direct_requires_one_peer'; end if;
 if p_kind<>'direct' and (p_title is null or char_length(trim(p_title))<2 or char_length(trim(p_title))>120) then raise exception 'title_required'; end if;
 insert into public.buildpulse_social_conversations(kind,title,created_by) values(p_kind,case when p_kind='direct' then null else trim(p_title) end,uid) returning id into cid;
 insert into public.buildpulse_social_members(conversation_id,user_id,role) values(cid,uid,'owner');
 foreach h in array p_member_handles loop
  select user_id,allow_messages into target,allow_mode from public.buildpulse_social_profiles where lower(handle)=lower(trim(h)) and discoverable=true;
  if target is null or target=uid then raise exception 'invalid_member'; end if;
  if p_kind='direct' then
   if allow_mode='nobody' then raise exception 'messages_not_allowed'; end if;
   if allow_mode='followers' then select exists(select 1 from public.buildpulse_social_follows where follower_id=uid and following_id=target) into is_follower;
    if not is_follower then raise exception 'messages_followers_only'; end if;
   end if;
  end if;
  insert into public.buildpulse_social_members(conversation_id,user_id,role) values(cid,target,'member') on conflict do nothing;
 end loop;
 return cid;
end $$;
revoke all on function public.buildpulse_social_create_conversation(text,text,text[]) from public,anon;
grant execute on function public.buildpulse_social_create_conversation(text,text,text[]) to authenticated;

create or replace function public.buildpulse_social_add_member(p_conversation uuid,p_handle text,p_role text default 'member')
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=(select auth.uid()); target uuid; k text;
begin
 if uid is null then raise exception 'auth_required'; end if;
 if p_role not in ('member','moderator') then raise exception 'invalid_role'; end if;
 select c.kind into k from public.buildpulse_social_conversations c join public.buildpulse_social_members m on m.conversation_id=c.id where c.id=p_conversation and m.user_id=uid and m.role in ('owner','moderator');
 if k is null or k='direct' then raise exception 'not_allowed'; end if;
 select user_id into target from public.buildpulse_social_profiles where lower(handle)=lower(trim(p_handle)) and discoverable=true;
 if target is null then raise exception 'profile_not_found'; end if;
 insert into public.buildpulse_social_members(conversation_id,user_id,role) values(p_conversation,target,p_role) on conflict(conversation_id,user_id) do update set role=excluded.role;
end $$;
revoke all on function public.buildpulse_social_add_member(uuid,text,text) from public,anon;
grant execute on function public.buildpulse_social_add_member(uuid,text,text) to authenticated;
