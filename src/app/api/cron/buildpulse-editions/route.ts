import {NextRequest,NextResponse} from "next/server";
import {buildEdition} from "@/lib/buildpulse/edition-builder";
import {composeBuildPulseEdition} from "@/lib/buildpulse/compose";
import {createAdminClient} from "@/lib/supabase/admin";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function authorized(req:NextRequest){
 const secret=process.env.CRON_SECRET?.trim();
 return Boolean(secret&&req.headers.get("authorization")===`Bearer ${secret}`);
}

export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
 const now=new Date();
 const jobs:("daily"|"weekly")[]=["daily"];
 if(now.getUTCDay()===1)jobs.push("weekly");
 const results=[];
 for(const type of jobs){
  try{
   const built=await buildEdition(type,"en");
   if(built.skipped||!built.editionId){results.push({type,...built});continue}
   const composed=await composeBuildPulseEdition(built.editionId);
   results.push({type,...built,composed:true,revision:composed.revision});
  }catch(error){
   const message=error instanceof Error?error.message:"edition_generation_failed";
   const db=createAdminClient();
   if(db)await db.from("buildpulse_job_runs").insert({job_name:`edition-${type}-scheduled`,status:"failed",started_at:new Date().toISOString(),finished_at:new Date().toISOString(),error:message.slice(0,2000)});
   results.push({type,error:message});
  }
 }
 return NextResponse.json({ok:results.every(x=>!("error" in x)),approvalRequired:true,deliveryTriggered:false,results});
}
