import {NextRequest,NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getBuildPulseCampaign} from "@/lib/buildpulse/brevo";
import {startBuildPulseJob,finishBuildPulseJob} from "@/lib/buildpulse/job-run";

export async function GET(req:NextRequest){
 const secret=process.env.CRON_SECRET;if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({ok:false},{status:401});
 const runId=await startBuildPulseJob("delivery-reconcile"),admin=createAdminClient();if(!admin){await finishBuildPulseJob(runId,"failed",{},"Supabase admin unavailable");return NextResponse.json({ok:false},{status:503})}
 try{
  const {data,error}=await admin.from("buildpulse_editions").select("id,brevo_campaign_id,status").not("brevo_campaign_id","is",null).in("status",["approved","scheduled","sending"]).limit(50);if(error)throw error;
  let checked=0,finalized=0,failed=0;
  for(const edition of data??[]){checked++;const campaign=await getBuildPulseCampaign(String(edition.brevo_campaign_id));if(!campaign.ok){failed++;continue}const state=campaign.status.toLowerCase();if(state==="sent"){const sentAt=campaign.sentDate||new Date().toISOString();const {error:updateError}=await admin.from("buildpulse_editions").update({status:"sent",brevo_dispatch_state:"sent",sent_at:sentAt,published_at:sentAt,archive_visible:true,dispatch_claim_token:null,dispatch_claimed_at:null,updated_at:new Date().toISOString()}).eq("id",edition.id).eq("brevo_campaign_id",edition.brevo_campaign_id).in("status",["approved","scheduled","sending"]);if(updateError)failed++;else finalized++}}
  const metrics={checked,finalized,failed};await finishBuildPulseJob(runId,failed?"failed":"ok",metrics,failed?`${failed} campaign status check(s) failed`:undefined);return NextResponse.json({ok:failed===0,...metrics},{status:failed?207:200});
 }catch(error){const message=error instanceof Error?error.message:"unknown";await finishBuildPulseJob(runId,"failed",{},message);return NextResponse.json({ok:false,error:message},{status:500})}
}
