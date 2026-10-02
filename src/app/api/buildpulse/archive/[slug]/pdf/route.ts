import {getSupabasePublicConfig} from "@/lib/supabase/env";
export const dynamic="force-dynamic";
export async function GET(_req:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const {url,key}=getSupabasePublicConfig();
 const endpoint=new URL(`${url}/functions/v1/buildpulse-content-runtime`);
 endpoint.searchParams.set("action","pdf");endpoint.searchParams.set("slug",slug);
 const upstream=await fetch(endpoint,{cache:"no-store",headers:{apikey:key}}).catch(()=>null);
 if(!upstream||!upstream.ok)return new Response("Not found",{status:404});
 return new Response(await upstream.arrayBuffer(),{headers:{
  "Content-Type":upstream.headers.get("content-type")??"application/pdf",
  "Content-Disposition":upstream.headers.get("content-disposition")??`attachment; filename="${slug}.pdf"`,
  "Cache-Control":upstream.headers.get("cache-control")??"public, max-age=300",
  "X-Content-Type-Options":"nosniff"
 }});
}
