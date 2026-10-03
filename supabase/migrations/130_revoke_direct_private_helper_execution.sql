-- Private SECURITY DEFINER helpers are implementation details. Authenticated clients use governed public wrappers only.
revoke execute on function private.buildpulse_list_own_sessions_impl() from authenticated;
revoke execute on function private.buildpulse_social_add_member_impl(uuid,text,text) from authenticated;
revoke execute on function private.buildpulse_social_create_conversation_impl(text,text,text[]) from authenticated;
revoke execute on function private.buildpulse_social_member_role(uuid) from authenticated;
