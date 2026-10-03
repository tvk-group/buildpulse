import {createClient} from "@supabase/supabase-js";

export function createAdminClient(){
 const url=(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
 const key=(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
 if(!url||!key)return null;
 return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
}
