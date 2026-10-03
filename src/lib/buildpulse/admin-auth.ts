import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/config/env";
import { createClientSafe } from "@/utils/supabase/server";

export async function requireBuildPulseAdmin(){
 const supabase=createClientSafe(await cookies());
 if(!supabase)return {ok:false as const};
 const {data:{user}}=await supabase.auth.getUser();
 if(!user?.email)return {ok:false as const};
 const email=user.email.toLowerCase();
 const admin=createAdminClient();
 if(!admin)return {ok:false as const};

 const env=(getServerEnv().ADMIN_EMAILS??"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
 let authorized=env.includes(email);
 if(!authorized){
  const {data:role}=await admin.from("role_assignments").select("role").eq("user_id",user.id).in("role",["admin","founder"]).limit(1).maybeSingle();
  authorized=Boolean(role);
 }
 if(!authorized)return {ok:false as const};

 const {data:profile}=await admin.from("buildpulse_workforce_profiles").select("require_mfa,revoked_at,access_expires_at").eq("user_id",user.id).maybeSingle();
 if(profile?.revoked_at)return {ok:false as const};
 if(profile?.access_expires_at&&new Date(profile.access_expires_at).getTime()<=Date.now())return {ok:false as const};
 if(profile?.require_mfa){
  const {data:aal,error}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if(error||aal?.currentLevel!=="aal2")return {ok:false as const,mfaRequired:true as const};
 }
 return {ok:true as const,email,userId:user.id};
}
