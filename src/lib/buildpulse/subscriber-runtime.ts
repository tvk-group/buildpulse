import {getSupabasePublicConfig} from "@/lib/supabase/env";

export async function callBuildPulseSubscriberRuntime(body:Record<string,unknown>,authorization?:string|null){
  const {url,key}=getSupabasePublicConfig();
  const endpoint=new URL(url+"/functions/v1/buildpulse-subscriber-runtime");
  const headers:Record<string,string>={"Content-Type":"application/json",apikey:key};
  if(authorization)headers.Authorization=authorization;
  const response=await fetch(endpoint,{method:"POST",cache:"no-store",headers,body:JSON.stringify(body)}).catch(()=>null);
  if(!response)return {ok:false,status:503,body:{ok:false,error:"subscriber_runtime_unavailable"}};
  const payload=await response.json().catch(()=>({ok:false,error:"invalid_runtime_response"}));
  return {ok:response.ok,status:response.status,body:payload};
}
