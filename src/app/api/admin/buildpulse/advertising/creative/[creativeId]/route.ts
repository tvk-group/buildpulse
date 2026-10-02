import {createClient} from "@/lib/supabase/server";
import {getSupabasePublicConfig} from "@/lib/supabase/env";

export async function GET(_request:Request,{params}:{params:Promise<{creativeId:string}>}){
  const {creativeId}=await params;
  if(!/^[0-9a-f-]{36}$/i.test(creativeId))return new Response("Not found",{status:404});
  const supabase=await createClient();
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)return new Response("Unauthorized",{status:401});
  const {url,key}=getSupabasePublicConfig();
  const endpoint=new URL(`${url}/functions/v1/buildpulse-ad-admin`);
  endpoint.searchParams.set("action","creative");
  endpoint.searchParams.set("creativeId",creativeId);
  const response=await fetch(endpoint,{cache:"no-store",headers:{apikey:key,Authorization:`Bearer ${session.access_token}`}});
  if(!response.ok)return new Response(response.status===403?"Forbidden":"Not found",{status:response.status===403?403:404});
  return new Response(await response.arrayBuffer(),{headers:{
    "Content-Type":response.headers.get("content-type")??"application/octet-stream",
    "Cache-Control":"private, no-store",
    "ETag":response.headers.get("etag")??"",
    "X-Content-Type-Options":"nosniff",
    "Content-Security-Policy":"default-src 'none'"
  }});
}
