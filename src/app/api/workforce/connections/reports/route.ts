import {NextRequest,NextResponse} from "next/server";
import {requireBuildPulseWorkforce} from "@/lib/buildpulse/workforce-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {createBuildPulseNotification} from "@/lib/buildpulse/notifications";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(req:NextRequest){
 const auth=await requireBuildPulseWorkforce(["founder","admin","moderation","support"]);
 if(!auth.ok)return NextResponse.json({ok:false,error:auth.reason},{status:auth.reason==="mfa_required"?403:401});
 const b=await req.json().catch(()=>null),reportId=String(b?.reportId||""),decision=String(b?.decision||""),notes=String(b?.notes||"").trim();
 if(!uuid.test(reportId)||!["reviewed","dismissed","actioned"].includes(decision)||notes.length<3||notes.length>2000)return NextResponse.json({ok:false,error:"invalid_request"},{status:400});
 const db=createAdminClient();if(!db)return NextResponse.json({ok:false,error:"unavailable"},{status:503});
 const {data:r,error:readError}=await db.from("buildpulse_user_safety_actions").select("id,actor_id,target_id,action,review_status").eq("id",reportId).eq("action","report").maybeSingle();
 if(readError||!r)return NextResponse.json({ok:false,error:"report_not_found"},{status:404});
 if(r.review_status!=="pending")return NextResponse.json({ok:false,error:"report_already_reviewed"},{status:409});
 const now=new Date().toISOString();
 const {data:updated,error}=await db.from("buildpulse_user_safety_actions").update({review_status:decision,reviewed_by:auth.userId,reviewed_at:now,review_notes:notes}).eq("id",reportId).eq("review_status","pending").select("id").maybeSingle();
 if(error||!updated)return NextResponse.json({ok:false,error:"report_update_failed"},{status:409});
 await db.from("buildpulse_workforce_audit_log").insert({actor_user_id:auth.userId,action:`connections_report_${decision}`,resource_type:"connections_report",resource_id:reportId,metadata:{reporter_user_id:r.actor_id,target_user_id:r.target_id,notes}});
 await createBuildPulseNotification({userId:r.actor_id,kind:"moderation",title:decision==="dismissed"?"Your Connections report was reviewed":"Your Connections report was actioned",body:notes.slice(0,500),href:"/connections",metadata:{report_id:reportId,decision},dedupeKey:`connections-report:${reportId}:${decision}`});
 return NextResponse.json({ok:true,status:decision});
}