import {NextRequest,NextResponse} from "next/server";
import {getSupabasePublicConfig} from "@/lib/supabase/env";
export const runtime="nodejs";
export async function GET(req:NextRequest,{params}:{params:Promise<{storyId:string}>}){
 const {storyId}=await params;if(!/^[0-9a-f-]{36}$/i.test(storyId))return NextResponse.json({error:"invalid_story"},{status:400});
 const config=getSupabasePublicConfig();if(!config.configured)return NextResponse.json({error:"unavailable"},{status:503});
 const endpoint=new URL("/functions/v1/buildpulse-outbound",config.url);
 const response=await fetch(endpoint,{method:"POST",cache:"no-store",headers:{apikey:config.key,Authorization:`Bearer ${config.key}`,"Content-Type":"application/json"},body:JSON.stringify({story_id:storyId})});
 const data=await response.json().catch(()=>null);if(!response.ok||!data?.destination)return NextResponse.json({error:data?.error||"redirect_unavailable"},{status:response.status||503});
 return NextResponse.redirect(data.destination,302);
}