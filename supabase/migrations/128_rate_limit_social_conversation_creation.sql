-- Enforce Social conversation creation limits inside the callable RPC, not only in the HTTP client.
create or replace function public.buildpulse_social_create_conversation(p_kind text,p_title text,p_member_handles text[] default '{}')
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
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
   if allow_mode='followers' then
    select exists(select 1 from public.buildpulse_social_follows where follower_id=uid and following_id=target) into is_follower;
    if not is_follower then raise exception 'messages_followers_only'; end if;
   end if;
  end if;
  insert into public.buildpulse_social_members(conversation_id,user_id,role) values(cid,target,'member') on conflict do nothing;
 end loop;
 return cid;
end $$;
revoke all on function public.buildpulse_social_create_conversation(text,text,text[]) from public,anon;
grant execute on function public.buildpulse_social_create_conversation(text,text,text[]) to authenticated;
