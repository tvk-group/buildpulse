import {getSupabasePublicConfig} from "@/lib/supabase/env";

export async function GET(_request:Request,{params}:{params:Promise<{orderId:string}>}){
  const {orderId}=await params;
  if(!/^[0-9a-f-]{36}$/i.test(orderId))return new Response("Not found",{status:404});
  const {url,key}=getSupabasePublicConfig();
  const endpoint=new URL(`${url}/functions/v1/buildpulse-ad-runtime`);
  endpoint.searchParams.set("action","creative");
  endpoint.searchParams.set("order",orderId);
  const upstream=await fetch(endpoint,{cache:"no-store",headers:{apikey:key}}).catch(()=>null);
  if(!upstream||!upstream.ok)return new Response("Not found",{status:404});
  const body=await upstream.arrayBuffer();
  return new Response(body,{status:200,headers:{
    "Content-Type":upstream.headers.get("content-type")??"application/octet-stream",
    "Cache-Control":upstream.headers.get("cache-control")??"public, max-age=300",
    "ETag":upstream.headers.get("etag")??"",
    "X-Content-Type-Options":"nosniff",
    "Content-Security-Policy":"default-src 'none'"
  }});
}
