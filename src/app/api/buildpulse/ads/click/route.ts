import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertSafeAdDestination } from "@/lib/buildpulse/ad-destination";

export async function GET(request:Request){
  const url=new URL(request.url),orderId=url.searchParams.get("order");
  if(!orderId||!/^[0-9a-f-]{36}$/i.test(orderId))return NextResponse.redirect(new URL("/",url),302);
  const admin=createAdminClient();if(!admin)return NextResponse.redirect(new URL("/",url),302);
  const now=new Date().toISOString();
  const {data}=await admin.from("buildpulse_ad_orders").select("id,destination_url,status,starts_at,ends_at").eq("id",orderId).eq("status","active").lte("starts_at",now).gte("ends_at",now).maybeSingle();
  if(!data)return NextResponse.redirect(new URL("/",url),302);
  let destination:URL;try{await assertSafeAdDestination(data.destination_url);destination=new URL(data.destination_url)}catch{return NextResponse.redirect(new URL("/",url),302)}
  const ua=request.headers.get("user-agent")??"";const humanLike=ua.length>=12&&!/(bot|crawler|spider|slurp|headless|preview|scanner|curl|wget)/i.test(ua);
  await admin.from("buildpulse_ad_events").insert({order_id:data.id,event_type:"click",event_key:randomUUID(),is_verified:humanLike,rejection_reason:humanLike?null:"automated_or_missing_user_agent",metadata:{source:"buildpulse_redirect",verification:"basic_user_agent_filter"}});
  return NextResponse.redirect(destination,302);
}
