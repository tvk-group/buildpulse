import {NextRequest,NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getBuildPulseCampaign,sendBuildPulseCampaignNow} from "@/lib/buildpulse/brevo";
import {startBuildPulseJob,finishBuildPulseJob} from "@/lib/buildpulse/job-run";

const MAX_SEND_RETRIES=3;
const RETRY_AFTER_MS=15*60*1000;

function retryDue(lastRetry:string|null,requestedAt:string|null){
 const anchor=lastRetry||requestedAt;if(!anchor)return true;
 const t=Date.parse(anchor);return !Number.isFinite(t)||Date.now()-t>=RETRY_AFTER_MS;
}

export async function GET(req:NextRequest){
 const secret=process.env.CRON_SECRET;if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({ok:false},{status:401});
 const runId=await startBuildPulseJob("delivery-reconcile"),admin=createAdminClient();if(!admin){await finishBuildPulseJob(runId,"failed",{},"Supabase admin unavailable");return NextResponse.json({ok:false},{status:503})}
 try{
  const {data,error}=await admin.from("buildpulse_editions").select("id,brevo_campaign_id,status,brevo_dispatch_state,brevo_send_retry_count,brevo_last_retry_at,brevo_send_requested_at").not("brevo_campaign_id","is",null).in("status",["approved","scheduled","sending"]).limit(50);if(error)throw error;
  let checked=0,finalized=0,failed=0,retried=0;
  for(const edition of data??[]){
   checked++;
   const campaignId=String(edition.brevo_campaign_id);
   const campaign=await getBuildPulseCampaign(campaignId);
   if(!campaign.ok){failed++;continue}
   const state=campaign.status.toLowerCase();
   if(state==="sent"){
    const sentAt=campaign.sentDate||new Date().toISOString();
    const {error:updateError}=await admin.from("buildpulse_editions").update({status:"sent",brevo_dispatch_state:"sent",sent_at:sentAt,published_at:sentAt,archive_visible:true,dispatch_claim_token:null,dispatch_claimed_at:null,updated_at:new Date().toISOString()}).eq("id",edition.id).eq("brevo_campaign_id",edition.brevo_campaign_id).in("status",["approved","scheduled","sending"]);
    if(updateError)failed++;else finalized++;
    continue;
   }
   const retryCount=Number(edition.brevo_send_retry_count??0);
   if(state==="draft"&&retryCount<MAX_SEND_RETRIES&&retryDue(edition.brevo_last_retry_at,edition.brevo_send_requested_at)){
    const now=new Date().toISOString();
    const dispatched=await sendBuildPulseCampaignNow(campaignId);
    const nextCount=retryCount+1;
    const {error:updateError}=await admin.from("buildpulse_editions").update(dispatched.ok?{status:"sending",brevo_dispatch_state:"send_requested",brevo_dispatch_error:null,brevo_send_retry_count:nextCount,brevo_last_retry_at:now,brevo_send_requested_at:now,updated_at:now}:{brevo_dispatch_state:"failed",brevo_dispatch_error:`retry ${nextCount}: ${dispatched.reason}`,brevo_send_retry_count:nextCount,brevo_last_retry_at:now,updated_at:now}).eq("id",edition.id).eq("brevo_campaign_id",edition.brevo_campaign_id).eq("brevo_send_retry_count",retryCount);
    if(updateError||!dispatched.ok)failed++;else retried++;
   }
  }
  const metrics={checked,finalized,retried,failed};await finishBuildPulseJob(runId,failed?"failed":"ok",metrics,failed?`${failed} campaign reconciliation operation(s) failed`:undefined);return NextResponse.json({ok:failed===0,...metrics},{status:failed?207:200});
 }catch(error){const message=error instanceof Error?error.message:"unknown";await finishBuildPulseJob(runId,"failed",{},message);return NextResponse.json({ok:false,error:message},{status:500})}
}
