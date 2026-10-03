import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2";

const API="https://api.brevo.com/v3";
const json=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const clean=(v:string|undefined)=>v?.trim()||"";

Deno.serve(async(req)=>{
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
 const {data:setting}=await db.from("buildpulse_private_settings").select("value").eq("key","edition_scheduler_secret").maybeSingle();
 if(!setting?.value||req.headers.get("x-buildpulse-scheduler-secret")!==setting.value)return json({ok:false,error:"unauthorized"},401);
 const {data:mailSetting}=await db.from("buildpulse_private_settings").select("value").eq("key","resend_domain_status").maybeSingle();
 if(mailSetting?.value!=="verified")return json({ok:false,error:"mail_domain_not_verified"},503);
 const apiKey=clean(Deno.env.get("BREVO_API_KEY")),fromEmail=clean(Deno.env.get("BREVO_FROM_EMAIL")),fromName=clean(Deno.env.get("BREVO_FROM_NAME"))||"TVK BuildPulse",listId=Number(clean(Deno.env.get("BREVO_MARKETING_LIST_ID")));
 if(!apiKey||!fromEmail||!Number.isInteger(listId)||listId<=0)return json({ok:false,error:"delivery_provider_not_configured"},503);
 const startedAt=new Date(),{data:due,error}=await db.from("buildpulse_editions").select("id,revision_number,edition_type,slug,subject,body_html,scheduled_at,founder_review_status,founder_approved_revision,brevo_campaign_id").eq("status","scheduled").eq("founder_review_status","approved").not("founder_approved_revision","is",null).is("brevo_campaign_id",null).lte("scheduled_at",startedAt.toISOString()).order("scheduled_at",{ascending:true}).limit(5);
 if(error)return json({ok:false,error:"scheduled_read_failed"},500);
 const results:any[]=[];
 for(const e of due||[]){
  if(e.founder_approved_revision!==e.revision_number||!e.body_html){results.push({editionId:e.id,status:"skipped",error:"current_revision_not_approved_or_uncomposed"});continue}
  const token=crypto.randomUUID();
  const {data:claimed,error:claimError}=await db.rpc("buildpulse_claim_dispatch",{p_edition_id:e.id,p_revision:e.revision_number,p_token:token});
  if(claimError||!claimed){results.push({editionId:e.id,status:"skipped",error:claimError?"claim_failed":"already_claimed"});continue}
  try{
   const create=await fetch(`${API}/emailCampaigns`,{method:"POST",headers:{"api-key":apiKey,"content-type":"application/json",accept:"application/json"},body:JSON.stringify({name:`BuildPulse ${e.edition_type} ${e.slug}`,subject:e.subject,sender:{name:fromName,email:fromEmail},recipients:{listIds:[listId]},htmlContent:e.body_html})});
   if(!create.ok)throw new Error(`campaign_create_${create.status}`);
   const payload=await create.json().catch(()=>({})) as {id?:number}; if(!payload.id)throw new Error("campaign_id_missing");
   const campaignId=String(payload.id),createdAt=new Date().toISOString();
   const {error:persistError}=await db.from("buildpulse_editions").update({brevo_campaign_id:campaignId,brevo_dispatch_state:"campaign_created",brevo_campaign_created_at:createdAt,brevo_dispatch_error:null,status:"approved",updated_at:createdAt}).eq("id",e.id).eq("dispatch_claim_token",token).is("brevo_campaign_id",null);
   if(persistError)throw new Error("campaign_created_state_persist_failed");
   const requestedAt=new Date().toISOString(); await db.from("buildpulse_editions").update({brevo_dispatch_state:"send_requested",brevo_send_requested_at:requestedAt,updated_at:requestedAt}).eq("id",e.id).eq("brevo_campaign_id",campaignId).eq("dispatch_claim_token",token);
   const send=await fetch(`${API}/emailCampaigns/${encodeURIComponent(campaignId)}/sendNow`,{method:"POST",headers:{"api-key":apiKey,accept:"application/json"}});
   if(!send.ok){await db.from("buildpulse_editions").update({brevo_dispatch_state:"failed",brevo_dispatch_error:`send_now_${send.status}`,updated_at:new Date().toISOString()}).eq("id",e.id).eq("brevo_campaign_id",campaignId);throw new Error(`send_now_${send.status}`)}
   await db.from("buildpulse_editions").update({status:"sending",brevo_dispatch_state:"send_requested",dispatch_claim_token:null,dispatch_claimed_at:null,updated_at:new Date().toISOString()}).eq("id",e.id).eq("brevo_campaign_id",campaignId).eq("dispatch_claim_token",token);
   results.push({editionId:e.id,status:"completed",campaignId});
  }catch(err){
   const message=err instanceof Error?err.message:"dispatch_failed";
   await db.rpc("buildpulse_release_dispatch_claim",{p_edition_id:e.id,p_token:token,p_error:message});
   results.push({editionId:e.id,status:"failed",error:message});
  }
 }
 const failed=results.filter(x=>x.status==="failed").length;
 await db.from("buildpulse_job_runs").insert({job_name:"approved-edition-dispatch-supabase",status:failed?"failed":"completed",started_at:startedAt.toISOString(),finished_at:new Date().toISOString(),error:failed?`${failed} approved edition dispatch(es) failed`:null,metrics:{due:due?.length||0,failed,completed:results.filter(x=>x.status==="completed").length,skipped:results.filter(x=>x.status==="skipped").length}});
 return json({ok:failed===0,due:due?.length||0,failed,results},failed?207:200);
});