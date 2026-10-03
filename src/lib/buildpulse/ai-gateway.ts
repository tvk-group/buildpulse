export type BuildPulseAiTask="news_draft"|"localize"|"summarize"|"moderation_triage"|"finance_reconcile"|"seo"|"ops";
export type BuildPulseAiRequest={task:BuildPulseAiTask;system:string;input:string;maxOutputTokens?:number;temperature?:number};
export type BuildPulseAiResult={provider:string;model:string;text:string;usage?:Record<string,unknown>};
type Provider="nvidia"|"openai"|"local";
const env=(k:string)=>process.env[k]?.trim();
const providers=(v:string):Provider[]=>v.split(",").map(x=>x.trim()).filter((x):x is Provider=>["local","nvidia","openai"].includes(x));
function order(task:BuildPulseAiTask):Provider[]{const taskKey="BUILDPULSE_AI_PROVIDER_ORDER_"+task.toUpperCase();const configured=providers(env(taskKey)||env("BUILDPULSE_AI_PROVIDER_ORDER")||"local,nvidia,openai");return configured.length?configured:["local","nvidia","openai"]}
async function callOpenAiLike(base:string,key:string|undefined,model:string,provider:string,r:BuildPulseAiRequest):Promise<BuildPulseAiResult>{
 const timeout=Math.max(5000,Math.min(120000,Number(env("BUILDPULSE_AI_TIMEOUT_MS")||30000)));const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{const res=await fetch(base.replace(/\/$/,"")+"/chat/completions",{method:"POST",signal:controller.signal,headers:{"content-type":"application/json",...(key?{authorization:`Bearer ${key}`}:{})},body:JSON.stringify({model,messages:[{role:"system",content:r.system},{role:"user",content:r.input}],temperature:r.temperature??0.2,max_tokens:Math.max(64,Math.min(4096,r.maxOutputTokens??1200))})});if(!res.ok)throw new Error(`AI provider error ${res.status}`);const data=await res.json();const text=data.choices?.[0]?.message?.content??"";if(!text.trim())throw new Error("AI provider returned empty output");return{provider,model,text,usage:data.usage}}finally{clearTimeout(timer)}
}
export async function runBuildPulseAi(r:BuildPulseAiRequest):Promise<BuildPulseAiResult>{
 const errors:string[]=[];const retries=Math.max(0,Math.min(2,Number(env("BUILDPULSE_AI_RETRIES")||1)));
 for(const p of order(r.task)){for(let attempt=0;attempt<=retries;attempt++){const started=Date.now();try{let out:BuildPulseAiResult|undefined;
  if(p==="local"){const base=env("BUILDPULSE_LOCAL_AI_BASE_URL");if(!base)break;out=await callOpenAiLike(base,env("BUILDPULSE_LOCAL_AI_API_KEY"),env("BUILDPULSE_LOCAL_AI_MODEL")||"local",p,r)}
  if(p==="nvidia"){const key=env("NVIDIA_NIM_API_KEY")||env("NVIDIA_API_KEY");if(!key)break;out=await callOpenAiLike(env("NVIDIA_NIM_BASE_URL")||"https://integrate.api.nvidia.com/v1",key,env("NVIDIA_NIM_MODEL")||"meta/llama-3.1-70b-instruct",p,r)}
  if(p==="openai"){const key=env("OPENAI_API_KEY");if(!key)break;out=await callOpenAiLike(env("OPENAI_BASE_URL")||"https://api.openai.com/v1",key,env("OPENAI_MODEL")||"gpt-5.6-luna",p,r)}
  if(out){console.info("buildpulse_ai_success",{task:r.task,provider:p,model:out.model,attempt:attempt+1,durationMs:Date.now()-started,usage:out.usage});return out}
 }catch(e){const message=e instanceof Error?e.message:"failed";errors.push(`${p} attempt ${attempt+1}: ${message}`);console.warn("buildpulse_ai_failure",{task:r.task,provider:p,attempt:attempt+1,durationMs:Date.now()-started,error:message})}}}
 throw new Error("No BuildPulse AI provider available"+(errors.length?": "+errors.join("; "):""))
}