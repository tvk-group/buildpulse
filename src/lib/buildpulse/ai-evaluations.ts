import {createAdminClient} from "@/lib/supabase/admin";
import {runBuildPulseAi} from "@/lib/buildpulse/ai-gateway";

function fixtureInput(v:unknown){
 const f=(v&&typeof v==="object"?v:{}) as Record<string,unknown>;
 const focus=typeof f.focus==="string"?f.focus:"evaluation";
 const sources=Array.isArray(f.sources)?f.sources.filter((x):x is string=>typeof x==="string").slice(0,12):[];
 return {input:`Editorial focus: ${focus}\n\n${sources.map((u,i)=>`[${i+1}] Evaluation source\nSource: ${u}`).join("\n\n")}`,sources};
}
export async function runBuildPulseAiEvaluations(promptKey:string,runBy:string|null){
 const db=createAdminClient();if(!db)throw new Error("Supabase admin unavailable");
 const {data:prompt,error:pe}=await db.from("buildpulse_ai_prompt_versions").select("version,task").eq("prompt_key",promptKey).eq("status","active").maybeSingle();
 if(pe||!prompt)throw new Error("active_prompt_unavailable");
 const {data:cases,error:ce}=await db.from("buildpulse_ai_evaluation_cases").select("id,name,input_fixture,required_source_terms,forbidden_claim_terms").eq("prompt_key",promptKey).eq("enabled",true).limit(10);
 if(ce)throw ce;if(!cases?.length)return {promptKey,promptVersion:prompt.version,total:0,passed:0,failed:0,results:[]};
 const results=[] as Array<Record<string,unknown>>;
 for(const test of cases){
  const {input,sources}=fixtureInput(test.input_fixture);
  const out=await runBuildPulseAi({task:prompt.task,promptKey,system:"",input,maxOutputTokens:1800,temperature:0});
  const lower=out.text.toLowerCase();
  const required=(test.required_source_terms??[]).filter((term:string)=>!lower.includes(String(term).toLowerCase()));
  const forbidden=(test.forbidden_claim_terms??[]).filter((term:string)=>lower.includes(String(term).toLowerCase()));
  const missingSources=sources.filter(u=>!out.text.includes(u));
  const passed=!required.length&&!forbidden.length&&!missingSources.length;
  const row={evaluation_case_id:test.id,prompt_key:promptKey,prompt_version:prompt.version,provider:out.provider,model:out.model,passed,required_terms_missing:required,forbidden_terms_found:forbidden,source_urls_missing:missingSources,output_excerpt:out.text.slice(0,1200),run_by:runBy};
  const {error:we}=await db.from("buildpulse_ai_evaluation_runs").insert(row);if(we)throw we;
  results.push({caseId:test.id,name:test.name,passed,requiredTermsMissing:required,forbiddenTermsFound:forbidden,sourceUrlsMissing:missingSources,provider:out.provider,model:out.model});
 }
 return {promptKey,promptVersion:prompt.version,total:results.length,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,results};
}
