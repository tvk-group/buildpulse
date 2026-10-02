import {getSupabasePublicConfig} from "@/lib/supabase/env";
const pixel='<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>';
export async function GET(request:Request){
  const url=new URL(request.url),orderId=url.searchParams.get("order");
  if(orderId&&/^[0-9a-f-]{36}$/i.test(orderId)){
    const {url:supabaseUrl,key}=getSupabasePublicConfig();
    const endpoint=new URL(`${supabaseUrl}/functions/v1/buildpulse-ad-runtime`);
    endpoint.searchParams.set("action","impression");
    endpoint.searchParams.set("order",orderId);
    await fetch(endpoint,{
      cache:"no-store",
      headers:{
        apikey:key,
        "x-buildpulse-user-agent":request.headers.get("user-agent")??"",
        "x-buildpulse-forwarded-for":request.headers.get("x-forwarded-for")??""
      }
    }).catch(()=>null);
  }
  return new Response(pixel,{headers:{"Content-Type":"image/svg+xml","Cache-Control":"no-store, private","Content-Security-Policy":"default-src 'none'"}});
}
