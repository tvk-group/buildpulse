import {createHash,timingSafeEqual} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";

function textId(value:unknown){return typeof value==="string"||typeof value==="number"?String(value):""}
export async function POST(req:NextRequest){
 const secret=process.env.BREVO_WEBHOOK_SECRET?.trim();
 const supplied=req.headers.get("x-buildpulse-webhook-secret")??"",a=Buffer.from(secret??""),b=Buffer.from(supplied);
 if(!secret||a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({ok:false},{status:401});
 const body=await req.json().catch(()=>null) as Record<string,unknown>|null;if(!body)return NextResponse.json({ok:false},{status:400});
 const admin=createAdminClient();if(!admin)return NextResponse.json({ok:false},{status:503});
 const email=typeof body.email==="string"?body.email.toLowerCase():null,event=textId(body.event)||"unknown";
 const providerId=textId(body["message-id"]??body.messageId),campaignId=textId(body.camp_id??body.campaignId??body.campaign_id);
 const eventTs=textId(body.ts_event??body.ts??body.date_event??body.date);
 const eventKey=createHash("sha256").update([event,email??"",providerId,campaignId,eventTs].join("|")).digest("hex");
 const epoch=typeof body.ts_event==="number"?body.ts_event:typeof body.ts==="number"?body.ts:null;
 const parsedDate=epoch!=null?new Date(epoch*1000):null;
 const occurredAt=parsedDate&&!Number.isNaN(parsedDate.getTime())?parsedDate.toISOString():new Date().toISOString();
 const {data:seen}=await admin.from("buildpulse_delivery_events").select("id").eq("event_key",eventKey).maybeSingle();if(seen)return NextResponse.json({ok:true,idempotent:true});
 let subscriberId:string|null=null,editionId:string|null=null;
 if(email){const {data:s}=await admin.from("buildpulse_subscribers").select("id").ilike("email",email).maybeSingle();subscriberId=s?.id??null}
 if(campaignId){const {data:e}=await admin.from("buildpulse_editions").select("id,status").eq("brevo_campaign_id",campaignId).maybeSingle();editionId=e?.id??null}
 const {error:insertError}=await admin.from("buildpulse_delivery_events").insert({edition_id:editionId,subscriber_id:subscriberId,provider:"brevo",event_type:event,provider_message_id:providerId||null,event_key:eventKey,payload:body,occurred_at:occurredAt});
 if(insertError)return NextResponse.json({ok:false,error:"delivery_event_persistence_failed"},{status:500});
 if(email&&["unsubscribed","hard_bounce","spam"].includes(event)){await admin.from("buildpulse_subscribers").update({status:event==="unsubscribed"?"unsubscribed":"suppressed",updated_at:new Date().toISOString()}).ilike("email",email)}

 return NextResponse.json({ok:true,editionId,reconciled:Boolean(editionId)});
}
