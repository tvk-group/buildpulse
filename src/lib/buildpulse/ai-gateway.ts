import {createAdminClient} from "@/lib/supabase/admin";
export type BuildPulseAiTask="news_draft"|"localize"|"summarize"|"moderation_triage"|"finance_reconcile"|"seo"|"ops";
export type BuildPulseAiRequest={task:BuildPulseAiTask;system:string;input:string;promptKey?:string;maxOutputTokens?:number;temperature?:number};
export type BuildPulseAiResult={provider:string;model:string;text:string;usage?:Record<string,unknown>};
type Provider="nvidia"|"openai"|"local";
type Privacy="local_only"|"private_preferred"|"standard";
type Cost="low"|"medium"|"high";
type Latency="low"|"medium"|"high";
type Policy={privacy:Privacy;maxCost:Cost;maxLatency:Latency};
const env=(k:string)=>process.env[k]?.trim();
const providers=(v:string):Provider[]=>v.split(",").map(x=>x.trim()).filter((x):x is Provider=>["local","nvidia","openai"].includes(x));
const rank={low:0,medium:1,high:2} as const;
const policyDefaults:Record<BuildPulseAiTask,Policy>={
 news_draft:{privacy:"standard",maxCost:"high",maxLatency:"high"},
 localize:{privacy:"standard",maxCost:"medium",maxLatency:"medium"},
 summarize:{privacy:"standard",maxCost:"medium",maxLatency:"medium"},
 moderation_triage:{privacy:"private_preferred",maxCost:"medium",maxLatency:"low"},
 finance_reconcile:{privacy:"local_only",maxCost:"medium",maxLatency:"medium"},
 seo:{privacy:"standard",maxCost:"medium",maxLatency:"medium"},
 ops:{privacy:"private_preferred",maxCost:"medium",maxLatency:"low"}
};
function enumEnv<T extends string>(key:string,allowed:readonly T[],fallback:T):T{const v=env(key) as T|undefined;return v&&allowed.includes(v)?v:fallback}
function taskPolicy(task:BuildPulseAiTask):Policy{const key=task.toUpperCase(),d=policyDefaults[task];return{
 privacy:enumEnv("BUILDPULSE_AI_PRIVACY_"+key,["local_only","private_preferred","standard"] as const,d.privacy),
 maxCost:enumEnv("BUILDPULSE_AI_MAX_COST_"+key,["low","medium","high"] as const,d.maxCost),
 maxLatency:enumEnv("BUILDPULSE_AI_MAX_LATENCY_"+key,["low","medium","high"] as const,d.maxLatency)
}}
function providerCost(p:Provider):Cost{return enumEnv("BUILDPULSE_AI_PROVIDER_COST_"+p.toUpperCase(),["low","medium","high"] as const,p==="local"?"low":"medium")}
function providerLatency(p:Provider):Latency{return enumEnv("BUILDPULSE_AI_PROVIDER_LATENCY_"+p.toUpperCase(),["low","medium","high"] as const,p==="local"?"low":"medium")}
function policyOrder(task:BuildPulseAiTask):Provider[]{const policy=taskPolicy(task),taskKey="BUILDPULSE_AI_PROVIDER_ORDER_"+task.toUpperCase();let configured=providers(env(taskKey)||env("BUILDPULSE_AI_PROVIDER_ORDER")||"local,nvidia,openai");if(!configured.length)configured=["local","nvidia","openai"];if(policy.privacy==="local_only")configured=configured.filter(p=>p==="local");configured=configured.filter(p=>rank[providerCost(p)]<=rank[policy.maxCost]&&rank[providerLatency(p)]<=rank[policy.maxLatency]);if(policy.privacy==="private_preferred")configured=[...configured].sort((a,b)=>Number(a!=="local")-Number(b!=="local"));return configured}
async function budgetAllowed(task:BuildPulseAiTask){const db=createAdminClient();if(!db)return false;const {data:b}=await db.from("buildpulse_ai_budgets").select("daily_token_limit,daily_request_limit,enabled").eq("task",task).maybeSingle();if(!b)return false;if(!b.enabled)return false;const since=new Date();since.setUTCHours(0,0,0,0);const {data:events}=await db.from("buildpulse_ai_usage_events").select("total_tokens").eq("task",task).eq("status","success").gte("created_at",since.toISOString());const rows=events??[],tokens=rows.reduce((n:any,e:any)=>n+Number(e.total_tokens??0),0);return !(b.daily_request_limit!=null&&rows.length>=b.daily_request_limit)&&!(b.daily_token_limit!=null&&tokens>=Number(b.daily_token_limit))}
async function recordSovraEngineering(task:BuildPulseAiTask,p:Provider,model:string,status:"success"|"failure",durationMs:number,attempt:number,usage?:Record<string,unknown>,error?:string,promptKey?:string,promptVersion?:number){const endpoint=env("SOVRA_ENGINEERING_ENDPOINT"),secret=env("SOVRA_LEARNING_INGEST_SECRET");if(!endpoint||!secret)return;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3500);try{await fetch(endpoint,{method:"POST",signal:controller.signal,headers:{"content-type":"application/json","x-sovra-learning-secret":secret},body:JSON.stringify({source_product:"BuildPulse AI",source_system:"tvk-group/buildpulse",task,provider:p,model,status,duration_ms:durationMs,attempt,usage:usage??{},prompt_key:promptKey??"",prompt_version:promptVersion??null,error_code:error?.slice(0,240)??"",metadata:{relationship:"SOVRA AI is the engineering and intelligence layer behind BuildPulse AI"}}),cache:"no-store"})}catch{}finally{clearTimeout(timer)}}
async function recordUsage(task:BuildPulseAiTask,p:Provider,model:string,status:"success"|"failure",durationMs:number,attempt:number,usage?:Record<string,unknown>,error?:string,promptKey?:string,promptVersion?:number){const db=createAdminClient();const u:any=usage??{};if(db)await db.from("buildpulse_ai_usage_events").insert({task,provider:p,model,status,input_tokens:u.prompt_tokens??u.input_tokens??null,output_tokens:u.completion_tokens??u.output_tokens??null,total_tokens:u.total_tokens??null,duration_ms:durationMs,attempt,error_code:error?.slice(0,240)??null,prompt_key:promptKey??null,prompt_version:promptVersion??null});await recordSovraEngineering(task,p,model,status,durationMs,attempt,usage,error,promptKey,promptVersion)}
async function callOpenAiLike(base:string,key:string|undefined,model:string,provider:string,r:BuildPulseAiRequest):Promise<BuildPulseAiResult>{
 const timeout=Math.max(5000,Math.min(120000,Number(env("BUILDPULSE_AI_TIMEOUT_MS")||30000)));const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{const res=await fetch(base.replace(/\/$/,"")+"/chat/completions",{method:"POST",signal:controller.signal,headers:{"content-type":"application/json",...(key?{authorization:`Bearer ${key}`}:{})},body:JSON.stringify({model,messages:[{role:"system",content:r.system},{role:"user",content:r.input}],temperature:r.temperature??0.2,max_tokens:Math.max(64,Math.min(4096,r.maxOutputTokens??1200))})});if(!res.ok)throw new Error(`AI provider error ${res.status}`);const data=await res.json();const text=data.choices?.[0]?.message?.content??"";if(!text.trim())throw new Error("AI provider returned empty output");return{provider,model,text,usage:data.usage}}finally{clearTimeout(timer)}
}
export async function runBuildPulseAi(r:BuildPulseAiRequest):Promise<BuildPulseAiResult>{
 let promptVersion:number|undefined; if(r.promptKey){const db=createAdminClient();if(!db)throw new Error("BuildPulse AI prompt registry unavailable");const {data:p,error}=await db.from("buildpulse_ai_prompt_versions").select("version,task,system_prompt,source_grounding_required").eq("prompt_key",r.promptKey).eq("status","active").maybeSingle();if(error||!p)throw new Error("BuildPulse AI active prompt unavailable for "+r.promptKey);if(p.task!==r.task)throw new Error("BuildPulse AI prompt task mismatch");r={...r,system:p.system_prompt};promptVersion=p.version}
 if(!(await budgetAllowed(r.task)))throw new Error("BuildPulse AI budget disabled or exhausted for task "+r.task);
 const selected=policyOrder(r.task),policy=taskPolicy(r.task);if(!selected.length)throw new Error("BuildPulse AI routing policy has no eligible provider for task "+r.task);
 console.info("buildpulse_ai_route",{task:r.task,privacy:policy.privacy,maxCost:policy.maxCost,maxLatency:policy.maxLatency,providers:selected});
 const errors:string[]=[];const retries=Math.max(0,Math.min(2,Number(env("BUILDPULSE_AI_RETRIES")||1)));
 for(const p of selected){for(let attempt=0;attempt<=retries;attempt++){const started=Date.now();try{let out:BuildPulseAiResult|undefined;
  if(p==="local"){const base=env("BUILDPULSE_LOCAL_AI_BASE_URL");if(!base)break;out=await callOpenAiLike(base,env("BUILDPULSE_LOCAL_AI_API_KEY"),env("BUILDPULSE_LOCAL_AI_MODEL")||"local",p,r)}
  if(p==="nvidia"){const key=env("NVIDIA_NIM_API_KEY")||env("NVIDIA_API_KEY");if(!key)break;out=await callOpenAiLike(env("NVIDIA_NIM_BASE_URL")||"https://integrate.api.nvidia.com/v1",key,env("NVIDIA_NIM_MODEL")||"meta/llama-3.1-70b-instruct",p,r)}
  if(p==="openai"){const key=env("OPENAI_API_KEY");if(!key)break;out=await callOpenAiLike(env("OPENAI_BASE_URL")||"https://api.openai.com/v1",key,env("OPENAI_MODEL")||"gpt-5.6-luna",p,r)}
  if(out){const durationMs=Date.now()-started;console.info("buildpulse_ai_success",{task:r.task,provider:p,model:out.model,attempt:attempt+1,durationMs,usage:out.usage});await recordUsage(r.task,p,out.model,"success",durationMs,attempt+1,out.usage,undefined,r.promptKey,promptVersion);return out}
 }catch(e){const message=e instanceof Error?e.message:"failed";const durationMs=Date.now()-started;errors.push(`${p} attempt ${attempt+1}: ${message}`);console.warn("buildpulse_ai_failure",{task:r.task,provider:p,attempt:attempt+1,durationMs,error:message});await recordUsage(r.task,p,"unknown","failure",durationMs,attempt+1,undefined,message,r.promptKey,promptVersion)}}}
 throw new Error("No BuildPulse AI provider available"+(errors.length?": "+errors.join("; "):""))
}
export function getBuildPulseAiRoutingPolicy(task:BuildPulseAiTask){const policy=taskPolicy(task);return{task,...policy,providers:policyOrder(task).map(provider=>({provider,cost:providerCost(provider),latency:providerLatency(provider)}))}}
