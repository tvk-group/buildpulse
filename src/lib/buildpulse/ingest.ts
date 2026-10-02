import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type IngestStory={url:string;sourceId?:string;title:string;summary?:string;category:string;publishedAt?:string;payload?:Record<string,unknown>};
const normalize=(s:string)=>s.toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");

export async function ingestBuildPulseStories(runKey:string,items:IngestStory[]){
 const admin=createAdminClient(); if(!admin) throw new Error("Supabase admin unavailable");
 const {data:existing}=await admin.from("buildpulse_ingestion_runs").select("id,status").eq("run_key",runKey).maybeSingle();
 if(existing?.status==="completed") return {idempotent:true,accepted:0,rejected:0};
 const run=existing ?? (await admin.from("buildpulse_ingestion_runs").insert({run_key:runKey}).select("id,status").single()).data;
 if(!run) throw new Error("Could not create ingestion run");
 let accepted=0,rejected=0;
 try{
  for(const item of items){
   const normalizedTitle=normalize(item.title); const contentHash=hash(normalizedTitle+"|"+(item.summary??""));
   const {data:urlDupe,error:urlErr}=await admin.from("buildpulse_stories").select("id").eq("canonical_url",item.url).limit(1).maybeSingle();
   if(urlErr) throw urlErr; let isDupe=!!urlDupe;
   if(!isDupe){const {data:hashDupe,error:hashErr}=await admin.from("buildpulse_stories").select("id").eq("content_hash",contentHash).limit(1).maybeSingle();if(hashErr)throw hashErr;isDupe=!!hashDupe;}
   if(isDupe){rejected++;continue;}
   const {error}=await admin.from("buildpulse_stories").insert({canonical_url:item.url,source_id:item.sourceId??null,title:item.title,normalized_title:normalizedTitle,summary:item.summary??null,category:item.category,published_at:item.publishedAt??null,source_payload:item.payload??{},content_hash:contentHash,verification_state:"pending"});
   if(error){if(error.code==="23505")rejected++;else throw error}else accepted++;
  }
  await admin.from("buildpulse_ingestion_runs").update({status:"completed",discovered_count:items.length,accepted_count:accepted,rejected_count:rejected,completed_at:new Date().toISOString()}).eq("id",run.id);
  return {idempotent:false,accepted,rejected};
 }catch(error){
  await admin.from("buildpulse_ingestion_runs").update({status:"failed",error_summary:error instanceof Error?error.message:"unknown",completed_at:new Date().toISOString()}).eq("id",run.id);
  throw error;
 }
}
