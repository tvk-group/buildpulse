import { NextRequest,NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishBuildPulseEdition } from "@/lib/buildpulse/publish";
import { startBuildPulseJob,finishBuildPulseJob } from "@/lib/buildpulse/job-run";

export async function GET(req:NextRequest){
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({ok:false},{status:401});
 const runId=await startBuildPulseJob("publish");
 const admin=createAdminClient();
 if(!admin){await finishBuildPulseJob(runId,"failed",{},"Supabase admin unavailable");return NextResponse.json({ok:false},{status:503})}
 try{
  const now=new Date().toISOString();
  const {data,error}=await admin.from("buildpulse_editions").select("id").eq("status","scheduled").lte("scheduled_at",now).limit(10);
  if(error)throw error;
  const results=[];let failed=0;
  for(const e of data??[]){
   try{results.push({id:e.id,...await publishBuildPulseEdition(e.id)})}
   catch(error){failed++;results.push({id:e.id,error:error instanceof Error?error.message:"unknown"})}
  }
  const metrics={processed:results.length,failed,succeeded:results.length-failed};
  await finishBuildPulseJob(runId,failed?"failed":"ok",metrics,failed?`${failed} scheduled publication(s) failed`:undefined);
  return NextResponse.json({ok:failed===0,...metrics,results},{status:failed?207:200});
 }catch(error){
  const message=error instanceof Error?error.message:"unknown";
  await finishBuildPulseJob(runId,"failed",{},message);
  return NextResponse.json({ok:false,error:message},{status:500});
 }
}
