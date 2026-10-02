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
 const env=(getServerEnv().ADMIN_EMAILS??"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(env.includes(email))return {ok:true as const,email};
 const admin=createAdminClient();
 if(!admin)return {ok:false as const};
 const {data}=await admin.from("role_assignments").select("role").eq("user_id",user.id).in("role",["admin","founder"]).limit(1).maybeSingle();
 return data?{ok:true as const,email}:{ok:false as const};
}
