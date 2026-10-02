import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { upsertBuildPulseContact } from "@/lib/buildpulse/brevo";
import { recordBuildPulseConsentEvent } from "@/lib/buildpulse/consent-events";

const schema=z.object({
 email:z.string().email().max(320),
 locale:z.string().min(2).max(10).default("en"),
 cadence:z.enum(["daily","weekly","both"]).default("weekly"),
 topics:z.array(z.enum(["ai","blockchain","crypto","security","digital-economy","entelekron"])).min(1).max(6).default(["ai","blockchain","crypto","security","digital-economy","entelekron"]),
 consent:z.literal(true),
 consentSource:z.enum(["buildpulse_web","ecosystem_prompt","account_preferences","transactional_email"]).default("buildpulse_web"),
 surface:z.string().max(80).optional(), product:z.string().max(80).optional(), path:z.string().max(300).optional()
});

export async function POST(req:NextRequest){
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success) return NextResponse.json({ok:false,error:"invalid_request"},{status:400});
 const admin=createAdminClient();
 if(!admin) return NextResponse.json({ok:false,error:"service_unavailable"},{status:503});
 const email=parsed.data.email.trim().toLowerCase();
 const {data:blocked}=await admin.from("email_marketing_unsubscribes").select("id").ilike("email",email).maybeSingle();
 if(blocked) return NextResponse.json({ok:false,error:"suppressed"},{status:409});
 const subscriberPatch={
   email,locale:parsed.data.locale,cadence:parsed.data.cadence,topics:parsed.data.topics,status:"active",
   consent_basis:"explicit",consent_source:parsed.data.consentSource,consent_at:new Date().toISOString(),acquisition_surface:parsed.data.surface??null,acquisition_product:parsed.data.product??"buildpulse",acquisition_path:parsed.data.path??null,updated_at:new Date().toISOString()
 };
 const {data:existing,error:lookupError}=await admin.from("buildpulse_subscribers").select("id").ilike("email",email).maybeSingle();
 if(lookupError){console.error("[buildpulse] subscribe lookup",lookupError.message);return NextResponse.json({ok:false,error:"persistence_failed"},{status:500});}
 let data:{id:string}|null=null;
 if(existing){
   const {data:updated,error:updateError}=await admin.from("buildpulse_subscribers").update(subscriberPatch).eq("id",existing.id).select("id").single();
   if(updateError){console.error("[buildpulse] subscribe update",updateError.message);return NextResponse.json({ok:false,error:"persistence_failed"},{status:500});}
   data=updated;
 }else{
   const {data:inserted,error:insertError}=await admin.from("buildpulse_subscribers").insert(subscriberPatch).select("id").single();
   if(insertError){
     // A concurrent normalized-email insert may win the expression-unique race.
     const {data:raced,error:raceLookupError}=await admin.from("buildpulse_subscribers").select("id").ilike("email",email).maybeSingle();
     if(raceLookupError||!raced){console.error("[buildpulse] subscribe insert",insertError.message);return NextResponse.json({ok:false,error:"persistence_failed"},{status:500});}
     const {data:updated,error:updateError}=await admin.from("buildpulse_subscribers").update(subscriberPatch).eq("id",raced.id).select("id").single();
     if(updateError){console.error("[buildpulse] subscribe race update",updateError.message);return NextResponse.json({ok:false,error:"persistence_failed"},{status:500});}
     data=updated;
   }else data=inserted;
 }
 if(!data) return NextResponse.json({ok:false,error:"persistence_failed"},{status:500});
 const sync=await upsertBuildPulseContact(parsed.data);
 if(sync.ok) await admin.from("buildpulse_subscribers").update({brevo_synced_at:new Date().toISOString()}).eq("id",data.id);
 await recordBuildPulseConsentEvent({email,subscriberId:data.id,action:"subscribe",surface:parsed.data.surface,product:parsed.data.product??"buildpulse",path:parsed.data.path,metadata:{consentSource:parsed.data.consentSource,cadence:parsed.data.cadence}});
 return NextResponse.json({ok:true,deliverySync:sync.ok?"synced":"pending"});
}
