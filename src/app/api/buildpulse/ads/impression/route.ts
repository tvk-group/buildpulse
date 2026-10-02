import {randomUUID} from "node:crypto";
import {createAdminClient} from "@/lib/supabase/admin";
const pixel='<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>';
export async function GET(request:Request){
 const url=new URL(request.url),orderId=url.searchParams.get("order"),admin=createAdminClient();
 if(admin&&orderId&&/^[0-9a-f-]{36}$/i.test(orderId)){const now=new Date().toISOString();const {data}=await admin.from("buildpulse_ad_orders").select("id").eq("id",orderId).eq("status","active").lte("starts_at",now).gte("ends_at",now).maybeSingle();if(data){const ua=request.headers.get("user-agent")??"";const humanLike=ua.length>=12&&!/(bot|crawler|spider|slurp|headless|preview|scanner|curl|wget)/i.test(ua);await admin.from("buildpulse_ad_events").insert({order_id:data.id,event_type:"impression",event_key:randomUUID(),is_verified:humanLike,rejection_reason:humanLike?null:"automated_or_missing_user_agent",metadata:{source:"buildpulse_pixel",verification:"basic_user_agent_filter"}})}}
 return new Response(pixel,{headers:{"Content-Type":"image/svg+xml","Cache-Control":"no-store, private","Content-Security-Policy":"default-src 'none'"}});
}
