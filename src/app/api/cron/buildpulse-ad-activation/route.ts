import {timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {startBuildPulseJob,finishBuildPulseJob} from "@/lib/buildpulse/job-run";
function authorized(req:Request){const secret=process.env.CRON_SECRET??"",supplied=(req.headers.get("authorization")??"").replace(/^Bearer\s+/i,"");const a=Buffer.from(secret),b=Buffer.from(supplied);return Boolean(secret)&&a.length===b.length&&timingSafeEqual(a,b)}
export async function GET(req:Request){
 if(!authorized(req))return NextResponse.json({ok:false},{status:401});
 const runId=await startBuildPulseJob("ad-activation"),admin=createAdminClient();
 if(!admin){await finishBuildPulseJob(runId,"failed",{},"Supabase admin unavailable");return NextResponse.json({ok:false},{status:503})}
 try{
  const now=new Date().toISOString();
  const {data:scheduled,error:scheduledError}=await admin.from("buildpulse_ad_orders").select("id").eq("status","scheduled").lte("starts_at",now).gte("ends_at",now).limit(100);
  if(scheduledError)throw scheduledError;
  let activated=0;
  for(const order of scheduled??[]){const [{data:payment},{data:badCreative}]=await Promise.all([admin.from("buildpulse_ad_payment_events").select("id,state").eq("order_id",order.id).order("observed_at",{ascending:false}).limit(1).maybeSingle(),admin.from("buildpulse_ad_creatives").select("id").eq("order_id",order.id).neq("review_state","approved").limit(1).maybeSingle()]);if(payment?.state==="confirmed"&&!badCreative){const {error}=await admin.from("buildpulse_ad_orders").update({status:"active",updated_at:now}).eq("id",order.id).eq("status","scheduled");if(!error)activated++}}
  const {data:expired,error:expiredError}=await admin.from("buildpulse_ad_orders").update({status:"completed",updated_at:now}).eq("status","active").lt("ends_at",now).select("id");
  if(expiredError)throw expiredError;
  const metrics={activated,completed:expired?.length??0,eligible:scheduled?.length??0};
  await finishBuildPulseJob(runId,"ok",metrics);
  return NextResponse.json({ok:true,...metrics});
 }catch(error){const message=error instanceof Error?error.message:"unknown";await finishBuildPulseJob(runId,"failed",{},message);return NextResponse.json({ok:false,error:message},{status:500})}
}
