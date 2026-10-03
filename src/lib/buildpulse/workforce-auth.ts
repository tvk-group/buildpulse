import {cookies} from "next/headers";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClientSafe} from "@/utils/supabase/server";

export const WORKFORCE_ROLES=["founder","admin","engineering","editorial","finance","advertising","moderation","support","analyst","contractor"] as const;
export type WorkforceRole=typeof WORKFORCE_ROLES[number];
export type WorkforceFailureReason="auth_required"|"inactive"|"role_required"|"mfa_required"|"service_unavailable";

export async function requireBuildPulseWorkforce(allowed:readonly WorkforceRole[]=WORKFORCE_ROLES){
  const supabase=createClientSafe(await cookies());
  if(!supabase)return {ok:false as const,reason:"service_unavailable" as WorkforceFailureReason};
  const {data:{user}}=await supabase.auth.getUser();
  if(!user?.email)return {ok:false as const,reason:"auth_required" as WorkforceFailureReason};

  const admin=createAdminClient();
  if(!admin)return {ok:false as const,reason:"service_unavailable" as WorkforceFailureReason};

  const now=new Date().toISOString();
  const {data:profile}=await admin.from("buildpulse_workforce_profiles")
    .select("status,require_mfa,require_passkey,display_name,department")
    .eq("user_id",user.id).maybeSingle();
  if(!profile||profile.status!=="active")return {ok:false as const,reason:"inactive" as WorkforceFailureReason};

  const {data:roles}=await admin.from("role_assignments")
    .select("role,scope,expires_at").eq("user_id",user.id).is("revoked_at",null);
  const active=(roles??[])
    .filter((r:any)=>!r.expires_at||r.expires_at>now)
    .filter((r:any)=>allowed.includes(r.role));
  if(!active.length)return {ok:false as const,reason:"role_required" as WorkforceFailureReason};

  let assurance:{currentLevel?:string|null;nextLevel?:string|null}|null=null;
  if(profile.require_mfa){
    const result=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if(result.error||result.data?.currentLevel!=="aal2"){
      return {ok:false as const,reason:"mfa_required" as WorkforceFailureReason,nextLevel:result.data?.nextLevel??null};
    }
    assurance=result.data;
  }

  return {
    ok:true as const,userId:user.id,email:user.email,profile,
    roles:active.map((r:any)=>r.role as WorkforceRole),
    scopes:[...new Set(active.flatMap((r:any)=>r.scope??[]))],
    assurance
  };
}
