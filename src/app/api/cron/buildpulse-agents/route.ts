import {NextRequest,NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {executeBuildPulseAgent} from "@/lib/buildpulse/agent-runtime";

function authorized(req:NextRequest){const secret=process.env.CRON_SECRET?.trim();return Boolean(secret&&req.headers.get("authorization")===`Bearer ${secret}`)}

export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
 const db=createAdminClient();if(!db)return NextResponse.json({ok:false,error:"service_unavailable"},{status:503});
 const {data:claimed,error}=await (db.rpc as any)("buildpulse_claim_due_agent_schedules",{p_limit:12});
 if(error)return NextResponse.json({ok:false,error:"claim_failed"},{status:500});
 const results=[] as any[];
 for(const s of claimed??[]){
  let status:"completed"|"failed"="completed",detail:any;
  try{detail=await executeBuildPulseAgent(s.agent_code,s.input_template,"schedule");}
  catch(e){status="failed";detail={error:e instanceof Error?e.message:"agent_failed"}}
  await (db.rpc as any)("buildpulse_finish_agent_schedule",{p_schedule_id:s.schedule_id,p_claim_token:s.claim_token,p_status:status});
  results.push({scheduleId:s.schedule_id,agent:s.agent_code,status,...detail});
 }
 return NextResponse.json({ok:true,claimed:results.length,results});
}