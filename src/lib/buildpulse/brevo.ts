import { getServerEnv } from "@/config/env";
import { normalizeMarketingEmail } from "@/lib/marketing/unsubscribe";

const API = "https://api.brevo.com/v3";

function config() {
  const env = getServerEnv();
  const apiKey = env.BREVO_API_KEY?.trim();
  const listId = Number(env.BREVO_MARKETING_LIST_ID?.trim());
  return { apiKey, listId: Number.isFinite(listId) && listId > 0 ? listId : null };
}

export async function upsertBuildPulseContact(params: {email:string; locale:string; cadence:"daily"|"weekly"|"both"; topics:string[]}) {
  const {apiKey,listId}=config();
  if (!apiKey || !listId) return {ok:false as const,reason:"not_configured" as const};
  const email=normalizeMarketingEmail(params.email);
  const res=await fetch(`${API}/contacts`,{method:"POST",headers:{"api-key":apiKey,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({
    email,
    listIds:[listId],
    updateEnabled:true,
    attributes:{BUILDPULSE_LOCALE:params.locale,BUILDPULSE_CADENCE:params.cadence,BUILDPULSE_TOPICS:params.topics.join(",")}
  })});
  if(!res.ok){const detail=await res.text();console.error("[buildpulse] Brevo contact sync",res.status,detail);return {ok:false as const,reason:"provider_error" as const};}
  return {ok:true as const};
}

export async function createBuildPulseCampaign(params:{name:string;subject:string;html:string;scheduledAt?:string;recipientListId?:number}) {
  const {apiKey,listId}=config();
  const env=getServerEnv();
  const recipientListId=params.recipientListId??listId;
  if(!apiKey || !recipientListId || !env.BREVO_FROM_EMAIL?.trim()) return {ok:false as const,reason:"not_configured" as const};
  const res=await fetch(`${API}/emailCampaigns`,{method:"POST",headers:{"api-key":apiKey,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({
    name:params.name,
    subject:params.subject,
    sender:{name:env.BREVO_FROM_NAME?.trim() || "TVK BuildPulse",email:env.BREVO_FROM_EMAIL?.trim()},
    recipients:{listIds:[recipientListId]},
    htmlContent:params.html,
    ...(params.scheduledAt?{scheduledAt:params.scheduledAt}:{})
  })});
  if(!res.ok){const detail=await res.text();console.error("[buildpulse] Brevo campaign create",res.status,detail);return {ok:false as const,reason:"provider_error" as const};}
  const data=await res.json() as {id?:number};
  return {ok:true as const,campaignId:data.id ? String(data.id):undefined};
}

export async function sendBuildPulseCampaignNow(campaignId:string){const {apiKey}=config();if(!apiKey)return {ok:false as const,reason:"not_configured" as const};const id=encodeURIComponent(campaignId);const res=await fetch(`${API}/emailCampaigns/${id}/sendNow`,{method:"POST",headers:{"api-key":apiKey,Accept:"application/json"}});if(!res.ok){console.error("[buildpulse] Brevo sendNow",res.status,await res.text());return {ok:false as const,reason:"provider_error" as const};}return {ok:true as const}}

export async function getBuildPulseCampaign(campaignId:string){const {apiKey}=config();if(!apiKey)return {ok:false as const,reason:"not_configured" as const};const id=encodeURIComponent(campaignId);const res=await fetch(`${API}/emailCampaigns/${id}`,{headers:{"api-key":apiKey,Accept:"application/json"},cache:"no-store"});if(!res.ok){console.error("[buildpulse] Brevo campaign status",res.status,await res.text());return {ok:false as const,reason:"provider_error" as const};}const data=await res.json() as {status?:string;scheduledAt?:string;sentDate?:string};return {ok:true as const,status:data.status??"unknown",sentDate:data.sentDate??null,scheduledAt:data.scheduledAt??null}}
