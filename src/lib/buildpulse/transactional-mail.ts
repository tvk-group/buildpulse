import {createAdminClient} from "@/lib/supabase/admin";

type MailInput={to:string;subject:string;html?:string;text?:string;idempotencyKey:string;replyTo?:string};
const EMAIL=/^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function sendBuildPulseTransactionalMail(input:MailInput){
 const db=createAdminClient();
 if(!db)return {sent:false,reason:"mail_gate_unavailable"} as const;
 const {data:gate,error:gateError}=await db.from("buildpulse_private_settings").select("value").eq("key","resend_domain_status").maybeSingle();
 if(gateError||String(gate?.value||"").toLowerCase()!=="verified")return {sent:false,reason:"mail_domain_unverified"} as const;
 const key=process.env.RESEND_API_KEY?.trim(),from=process.env.BUILDPULSE_TRANSACTIONAL_FROM?.trim();
 if(!key||!from||!EMAIL.test(from.match(/<([^>]+)>/)?.[1]||from))return {sent:false,reason:"mail_provider_unconfigured"} as const;
 const to=String(input.to||"").trim().toLowerCase(),subject=String(input.subject||"").trim().slice(0,200),idempotencyKey=String(input.idempotencyKey||"").trim().slice(0,200);
 if(!EMAIL.test(to)||!subject||!idempotencyKey||(!input.html&&!input.text))return {sent:false,reason:"invalid_mail_request"} as const;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{authorization:`Bearer ${key}`,"content-type":"application/json","idempotency-key":idempotencyKey},body:JSON.stringify({from,to:[to],subject,html:input.html?.slice(0,200000),text:input.text?.slice(0,100000),reply_to:input.replyTo&&EMAIL.test(input.replyTo)?input.replyTo:undefined}),signal:controller.signal,cache:"no-store"});
  const body=await response.json().catch(()=>null);
  if(!response.ok)return {sent:false,reason:"provider_rejected",status:response.status} as const;
  if(!body?.id)return {sent:false,reason:"provider_response_invalid"} as const;
  return {sent:true,id:String(body.id)} as const;
 }catch{return {sent:false,reason:"provider_outcome_unknown"} as const}
 finally{clearTimeout(timer)}
}
