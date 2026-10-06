import {createHash} from "crypto";
import {NextRequest,NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
export const runtime="nodejs";
function hash(v:string){return createHash("sha256").update(v+"|buildpulse-outbound-v1").digest("hex")}
export async function GET(req:NextRequest,{params}:{params:Promise<{storyId:string}>}){
 const {storyId}=await params;const db=createAdminClient();if(!db)return NextResponse.json({error:"unavailable"},{status:503});
 const {data:story}=await db.from("buildpulse_stories").select("id,canonical_source_url,verification_state,publication_state").eq("id",storyId).maybeSingle();
 if(!story?.canonical_source_url||story.verification_state!=="verified"||story.publication_state==="withheld")return NextResponse.json({error:"not_found"},{status:404});
 let destination:URL;try{destination=new URL(story.canonical_source_url)}catch{return NextResponse.json({error:"invalid_destination"},{status:400})}
 if(destination.protocol!=="https:"&&destination.protocol!=="http:")return NextResponse.json({error:"invalid_destination"},{status:400});
 const host=destination.hostname.toLowerCase().replace(/^www\./,"");
 const {data:partner}=await db.from("buildpulse_outbound_partners").select("id,commercial_model,status,tracking_template,click_rate,currency").eq("domain",host).eq("status","active").maybeSingle();
 let redirect=destination.toString(),commercial=false,revenue:null|number=null,currency:null|string=null;
 if(partner&&partner.commercial_model!=="none"){
  commercial=true;currency=partner.currency;
  if(partner.commercial_model==="cpc"&&partner.click_rate!=null)revenue=Number(partner.click_rate);
  if(partner.tracking_template){redirect=partner.tracking_template.replaceAll("{url}",encodeURIComponent(destination.toString())).replaceAll("{story_id}",story.id)}
 }
 const ip=(req.headers.get("x-forwarded-for")||"").split(",")[0].trim(),ua=req.headers.get("user-agent")||"";
 await db.from("buildpulse_outbound_clicks").insert({story_id:story.id,partner_id:partner?.id??null,destination_host:host,destination_url:destination.toString(),commercial,visitor_hash:ip?hash(ip):null,ua_hash:ua?hash(ua):null,referrer_path:req.headers.get("referer")?.slice(0,1000)??null,eligible_revenue:revenue,currency,settlement_state:commercial?"reported":"unreported"});
 return NextResponse.redirect(redirect,302);
}