import {NextRequest,NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {executeBuildPulseAgent} from "@/lib/buildpulse/agent-runtime";
import {syncBuildPulseRouteInventory} from "@/lib/buildpulse/route-inventory";

function authorized(req:NextRequest){const secret=process.env.CRON_SECRET?.trim();return Boolean(secret&&req.headers.get("authorization")===`Bearer ${secret}`)}

export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
 const db=createAdminClient();if(!db)return NextResponse.json({ok:false,error:"service_unavailable"},{status:503});
 let routeInventory:{routes:number}|null=null;
 let routeWorkQueued=0;
 let specializedRouteWorkQueued=0;
 try{
  routeInventory=await syncBuildPulseRouteInventory();
  const {data:q,error:qErr}=await (db.rpc as any)("buildpulse_queue_incomplete_routes",{p_limit:50});
  if(qErr)throw qErr;
  routeWorkQueued=Number(q??0);
  const {data:sq,error:sqErr}=await (db.rpc as any)("buildpulse_queue_specialized_route_audits",{p_limit:120});
  if(sqErr)throw sqErr;
  specializedRouteWorkQueued=Number(sq??0);
 }catch(e){await db.from("buildpulse_job_runs").insert({job_name:"route-inventory-sync",status:"failed",started_at:new Date().toISOString(),finished_at:new Date().toISOString(),error:e instanceof Error?e.message:"route_inventory_sync_failed"});}
 const {data:claimed,error}=await (db.rpc as any)("buildpulse_claim_due_agent_schedules",{p_limit:30});
 if(error)return NextResponse.json({ok:false,error:"claim_failed"},{status:500});
 const results=[] as any[];
 const startedAt=Date.now();
 for(const s of claimed??[]){
  let status:"completed"|"failed"="completed",detail:any;
  let routeWork:any=null;
  try{
   let agentInput=s.input_template;
   if(s.agent_code==="page-completion"){
    const {data:work,error:workErr}=await (db.rpc as any)("buildpulse_claim_route_work",{p_limit:1});
    if(workErr)throw workErr;
    routeWork=Array.isArray(work)?work[0]:null;
    if(!routeWork){detail={status:"idle",message:"No queued route work"};}
    else agentInput={...s.input_template,routeWork:{id:routeWork.id,kind:routeWork.kind,priority:routeWork.priority,finding:routeWork.finding},instruction:"Audit this bounded route work item. Produce a concrete remediation proposal and verification plan. Do not deploy, publish, move money, change roles, expose secrets, weaken security, or delete data."};
   }
   if(!detail)detail=await executeBuildPulseAgent(s.agent_code,agentInput,"schedule");
   if(routeWork){
    const next=detail?.status==="failed"?"failed":"awaiting_approval";
    await (db.rpc as any)("buildpulse_finish_route_work",{p_work_id:routeWork.id,p_claim_token:routeWork.claim_token,p_status:next,p_error:detail?.error??null});
   }
  }
  catch(e){
   status="failed";detail={error:e instanceof Error?e.message:"agent_failed"};
   if(routeWork?.id&&routeWork?.claim_token)await (db.rpc as any)("buildpulse_finish_route_work",{p_work_id:routeWork.id,p_claim_token:routeWork.claim_token,p_status:"failed",p_error:detail.error});
  }
  await (db.rpc as any)("buildpulse_finish_agent_schedule",{p_schedule_id:s.schedule_id,p_claim_token:s.claim_token,p_status:status});
  results.push({scheduleId:s.schedule_id,agent:s.agent_code,scheduleStatus:status,...detail});
 }
 const failed=results.filter((x:any)=>x.scheduleStatus==="failed").length,awaitingApproval=results.filter((x:any)=>x.status==="awaiting_approval").length;
 await db.from("buildpulse_job_runs").insert({job_name:"agent-scheduler",status:failed?"failed":"completed",started_at:new Date(startedAt).toISOString(),finished_at:new Date().toISOString(),error:failed?`${failed} scheduled agent run(s) failed`:null,metrics:{claimed:results.length,failed,awaitingApproval,completed:results.length-failed-awaitingApproval}});
 return NextResponse.json({ok:true,routeInventory,routeWorkQueued,specializedRouteWorkQueued,claimed:results.length,failed,awaitingApproval,results});
}