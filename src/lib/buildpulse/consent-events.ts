import { createHash } from "node:crypto"; import { createAdminClient } from "@/lib/supabase/admin";
export async function recordBuildPulseConsentEvent(input:{email?:string;subscriberId?:string;action:"invite_shown"|"invite_dismissed"|"subscribe"|"preferences_changed"|"unsubscribe"|"suppressed";surface?:string;product?:string;path?:string;metadata?:Record<string,unknown>}){
 const admin=createAdminClient();if(!admin)return;const emailHash=createHash("sha256").update((input.email??"anonymous").trim().toLowerCase()).digest("hex");
 await admin.from("buildpulse_consent_events").insert({subscriber_id:input.subscriberId??null,email_hash:emailHash,action:input.action,surface:input.surface??null,product:input.product??null,path:input.path??null,metadata:input.metadata??{}});
}
