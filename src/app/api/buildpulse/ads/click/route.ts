import {NextResponse} from "next/server";
import {assertSafeAdDestination} from "@/lib/buildpulse/ad-destination";
import {getSupabasePublicConfig} from "@/lib/supabase/env";

export async function GET(request:Request){
  const url=new URL(request.url),orderId=url.searchParams.get("order");
  if(!orderId||(!/^[0-9a-f-]{36}$/i.test(orderId)&&!/^house:[0-9a-f-]{36}$/i.test(orderId)))return NextResponse.redirect(new URL("/",url),302);
  const {url:supabaseUrl,key}=getSupabasePublicConfig();
  try{
    const endpoint=new URL(`${supabaseUrl}/functions/v1/buildpulse-ad-runtime`);
    endpoint.searchParams.set("action","click");
    endpoint.searchParams.set("order",orderId);
    const response=await fetch(endpoint,{
      cache:"no-store",
      headers:{
        apikey:key,
        "x-buildpulse-user-agent":request.headers.get("user-agent")??"",
        "x-buildpulse-forwarded-for":request.headers.get("x-forwarded-for")??""
      }
    });
    if(!response.ok)return NextResponse.redirect(new URL("/",url),302);
    const body=await response.json() as {destination?:string};
    if(!body.destination)return NextResponse.redirect(new URL("/",url),302);
    await assertSafeAdDestination(body.destination);
    return NextResponse.redirect(new URL(body.destination),302);
  }catch{return NextResponse.redirect(new URL("/",url),302)}
}
