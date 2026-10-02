import { createAdminClient } from "@/lib/supabase/admin";
export async function reconcileBuildPulseUnsubscribe(email:string){const admin=createAdminClient();if(!admin)return;await admin.from("buildpulse_subscribers").update({status:"unsubscribed",updated_at:new Date().toISOString()}).ilike("email",email);}
