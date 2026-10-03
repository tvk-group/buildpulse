import {NextRequest,NextResponse} from "next/server";
import {requireBuildPulseWorkforce} from "@/lib/buildpulse/workforce-auth";
import {createAdminClient} from "@/lib/supabase/admin";
export async function POST(req:NextRequest){
 const auth=await requireBuildPulseWorkforce(["founder","admin","engineering","editorial","finance","moderation"]);
 if(!auth.ok)return NextResponse.json({ok:false,error:auth.reason},{status:401});
 const b=await req.json().catch(()=>null);
 if(!b||typeof b.approvalId!=="string"||!["approve","reject"].includes(b.action)||typeof b.notes!=="string"||b.notes.trim().length<2||b.notes.length>2000)return NextResponse.json({ok:false,error:"invalid_request"},{status:400});
 const db=createAdminClient();if(!db)return NextResponse.json({ok:false,error:"service_unavailable"},{status:503});
 const {data:a,error}=await db.from("buildpulse_agent_approvals").select("id,run_id,state,risk_level").eq("id",b.approvalId).maybeSingle();
 if(error||!a)return NextResponse.json({ok:false,error:"approval_not_found"},{status:404});
 if(a.state!=="pending")return NextResponse.json({ok:false,error:"approval_already_decided"},{status:409});
 const state=b.action==="approve"?"approved":"rejected",now=new Date().toISOString();
 const {error:u}=await db.from("buildpulse_agent_approvals").update({state,decided_at:now,decided_by:auth.userId,notes:b.notes.trim()}).eq("id",a.id).eq("state","pending");
 if(u)return NextResponse.json({ok:false,error:"approval_update_failed"},{status:500});
 await db.from("buildpulse_agent_runs").update({status:state,finished_at:now}).eq("id",a.run_id).eq("status","awaiting_approval");
 await db.from("buildpulse_workforce_audit_log").insert({actor_user_id:auth.userId,action:"agent_"+state,resource_type:"agent_run",resource_id:a.run_id,metadata:{approval_id:a.id,risk_level:a.risk_level,notes:b.notes.trim()}});
 return NextResponse.json({ok:true,state});
}