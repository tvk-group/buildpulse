import {NextRequest} from "next/server";
import {createHash} from "crypto";
import {ecosystemContext} from "@/lib/buildpulse/ecosystem-knowledge";
import {repositoryContext} from "@/lib/buildpulse/ecosystem-repositories";
export const runtime="nodejs";
export const dynamic="force-dynamic";

type ChatMessage={role:"user"|"assistant";content:string};
type LearningPayload={enabled?:boolean;visitorId?:string;locale?:string;voiceLocale?:string;accent?:string};
type Bucket={count:number;reset:number};

const EVREN_ENDPOINT=(process.env.EVREN_API_BASE_URL||"https://evren-llmapi.ssyz.org.tr/v1").replace(/\/$/,"");
const EVREN_DEFAULT_MODEL=process.env.EVREN_API_MODEL||"qwen3.8-flash-next";
const EVREN_ALLOWED_MODELS=(process.env.EVREN_API_MODELS||EVREN_DEFAULT_MODEL).split(",").map(x=>x.trim()).filter(Boolean);
const NVIDIA_ENDPOINT=(process.env.NVIDIA_AI_BASE_URL||"https://integrate.api.nvidia.com/v1").replace(/\/$/,"");
const NVIDIA_DEFAULT_MODEL=process.env.NVIDIA_AI_MODEL||"openai/gpt-oss-20b";
const NVIDIA_ALLOWED_MODELS=(process.env.NVIDIA_AI_MODELS||NVIDIA_DEFAULT_MODEL).split(",").map(x=>x.trim()).filter(Boolean);
const PROVIDER_ORDER=(process.env.BUILDPULSE_CHAT_PROVIDER_ORDER||"evren,nvidia").split(",").map(x=>x.trim().toLowerCase()).filter(x=>x==="evren"||x==="nvidia");
const buckets=new Map<string,Bucket>();
const WINDOW_MS=60_000;
const MAX_REQUESTS=Math.max(1,Number(process.env.BUILDPULSE_AI_RPM||"12"));
const PRODUCT_SYSTEM_PROMPT=`You are BuildPulse AI, the AI assistant inside BuildPulse. BuildPulse AI is developed as part of the SOVRA AI platform by TVK Labs & Technologies LTD. When asked who or what you are, identify the product as BuildPulse AI. If the user explicitly asks about the underlying model or inference provider, answer accurately from runtime/provider information and distinguish that infrastructure from the BuildPulse AI product identity. Be useful for questions, writing, reasoning, planning, software development, debugging, analysis, and general assistance. The website may also provide a separate SOVRA AI guide, but that guide must not replace or rename the BuildPulse AI product. When the user's message contains a bracketed Current BuildPulse page context, use that path only as navigation context and do not claim you can literally see the visitor or page. Never claim to be human, conscious, sentient, emotional, or capable of silently observing a visitor. You may adapt conversationally to preferences the user explicitly provides. Do not invent BuildPulse facts, affiliations, integrations, audits, partnerships, or product capabilities.`;

function learningVisitorHash(origin:string,visitorId:string){
 const salt=process.env.SOVRA_LEARNING_VISITOR_SALT||"";
 if(!salt||visitorId.length<16)return "";
 return createHash("sha256").update(salt+"|"+origin+"|"+visitorId.slice(0,160)).digest("hex");
}
async function recordSovraLearning(req:NextRequest,learning:LearningPayload|undefined,eventType:"user_message"|"assistant_reply",text:string){
 if(!learning?.enabled)return;
 const endpoint=process.env.SOVRA_LEARNING_ENDPOINT,secret=process.env.SOVRA_LEARNING_INGEST_SECRET;
 if(!endpoint||!secret)return;
 const origin=new URL(req.url).origin.toLowerCase();
 const visitorHash=learningVisitorHash(origin,String(learning.visitorId||""));
 if(!visitorHash)return;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3500);
 try{
  await fetch(endpoint,{method:"POST",signal:controller.signal,headers:{"content-type":"application/json","x-sovra-learning-secret":secret},body:JSON.stringify({
   visitor_hash:visitorHash,learning_enabled:true,event_type:eventType,site:"BuildPulse",
   source_product:"BuildPulse AI",source_channel:"build-with-ai",origin,
   page_url:origin+"/build-with-ai",locale:String(learning.locale||"").slice(0,20),
   locale_source:"buildpulse-workspace",voice_locale:String(learning.voiceLocale||"").slice(0,20),
   accent:String(learning.accent||"").slice(0,80),
   user_text:eventType==="user_message"?text.slice(0,4000):"",
   assistant_text:eventType==="assistant_reply"?text.slice(0,8000):"",
   consent_version:process.env.SOVRA_LEARNING_CONSENT_VERSION||"2026-10-04.1",
   metadata:{source_repo:"tvk-group/buildpulse",product_relation:"powered_by_sovra_ai"}
  }),cache:"no-store"});
 }catch{}finally{clearTimeout(timer)}
}


function clientKey(req:NextRequest){
 const forwarded=req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
 return forwarded||req.headers.get("x-real-ip")||"anonymous";
}
function limited(key:string){
 const now=Date.now(),current=buckets.get(key);
 if(buckets.size>5000){for(const [k,v] of buckets){if(v.reset<=now)buckets.delete(k)}}
 if(!current||current.reset<=now){buckets.set(key,{count:1,reset:now+WINDOW_MS});return false}
 current.count+=1;return current.count>MAX_REQUESTS;
}
function cleanMessages(value:unknown):ChatMessage[]{
 if(!Array.isArray(value))return [];
 return value.filter((m):m is ChatMessage=>!!m&&typeof m==="object"&&((m as ChatMessage).role==="user"||(m as ChatMessage).role==="assistant")&&typeof (m as ChatMessage).content==="string")
  .slice(-16).map(m=>({role:m.role,content:m.content.trim().slice(0,12000)})).filter(m=>m.content.length>0);
}

export async function GET(){
 const providers=PROVIDER_ORDER.filter(p=>p==="evren"?Boolean(process.env.EVREN_API_KEY):Boolean(process.env.NVIDIA_API_KEY));
 return Response.json({available:providers.length>0,providers,models:[...(process.env.EVREN_API_KEY?EVREN_ALLOWED_MODELS:[]),...(process.env.NVIDIA_API_KEY?NVIDIA_ALLOWED_MODELS:[])],defaultModel:providers[0]==="evren"?EVREN_DEFAULT_MODEL:NVIDIA_DEFAULT_MODEL,limits:{requestsPerMinute:MAX_REQUESTS,maxHistoryMessages:16,maxInputCharacters:12000}});
}

export async function POST(req:NextRequest){
 const available=PROVIDER_ORDER.filter(p=>p==="evren"?Boolean(process.env.EVREN_API_KEY):Boolean(process.env.NVIDIA_API_KEY));
 if(!available.length)return Response.json({error:"BuildPulse AI is not activated. Configure an approved server-side inference provider."},{status:503});
 if(limited(clientKey(req)))return Response.json({error:"Free AI limit reached for this minute. Please wait briefly and try again."},{status:429,headers:{"Retry-After":"60"}});
 let body:{messages?:unknown;model?:unknown;maxTokens?:unknown;learning?:LearningPayload};
 try{body=await req.json()}catch{return Response.json({error:"Invalid request."},{status:400})}
 const messages=cleanMessages(body.messages);
 if(!messages.length)return Response.json({error:"Enter a message first."},{status:400});
 const latestUser=[...messages].reverse().find(m=>m.role==="user")?.content??"";
 await recordSovraLearning(req,body.learning,"user_message",latestUser);
 const knowledge=[ecosystemContext(latestUser),repositoryContext(latestUser)].filter(Boolean).join("\n\n");
 const systemPrompt=knowledge?`${PRODUCT_SYSTEM_PROMPT}\n\n${knowledge}\n\nFor TVK ecosystem questions, use this canonical context. Correct obvious speech-to-text/name variants such as Entelechrome or Entelechron to ENTELΞKRON when context indicates it. Repository inventory is evidence of repository existence only, not launch, audit, partnership, security or production status. If a requested fact is not established, say so.`:PRODUCT_SYSTEM_PROMPT;
 const maxTokens=Math.max(64,Math.min(2048,typeof body.maxTokens==="number"&&Number.isFinite(body.maxTokens)?Math.floor(body.maxTokens):2048));
 const requested=typeof body.model==="string"?body.model:"";
 const errors:string[]=[];
 for(const provider of available){
  const endpoint=provider==="evren"?EVREN_ENDPOINT:NVIDIA_ENDPOINT;
  const apiKey=provider==="evren"?process.env.EVREN_API_KEY!:process.env.NVIDIA_API_KEY!;
  const allowed=provider==="evren"?EVREN_ALLOWED_MODELS:NVIDIA_ALLOWED_MODELS;
  const fallbackModel=provider==="evren"?EVREN_DEFAULT_MODEL:NVIDIA_DEFAULT_MODEL;
  const model=requested&&allowed.includes(requested)?requested:fallbackModel;
  const maxAttempts=provider==="evren"?2:1;
  for(let attempt=1;attempt<=maxAttempts;attempt++){
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),60_000);
   try{
    const upstream=await fetch(`${endpoint}/chat/completions`,{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${apiKey}`},body:JSON.stringify({model,messages:[{role:"system",content:systemPrompt},...messages],max_tokens:maxTokens,stream:false}),cache:"no-store",signal:controller.signal});
    const data=await upstream.json().catch(()=>null);
    if(!upstream.ok){
     const detail=data?.detail||data?.message||data?.error?.message||`Inference provider returned HTTP ${upstream.status}`;
     if(provider==="evren"&&upstream.status===503&&attempt<maxAttempts){await new Promise(resolve=>setTimeout(resolve,700));continue}
     throw new Error(String(detail).slice(0,300));
    }
    const answer=data?.choices?.[0]?.message?.content;
    if(typeof answer!=="string"||!answer.trim())throw new Error("Inference provider returned no answer.");
    await recordSovraLearning(req,body.learning,"assistant_reply",answer);
    return Response.json({content:answer,model:data?.model||model,provider:provider.toUpperCase(),poweredBy:"SOVRA AI"});
   }catch(error){
    const message=error instanceof Error?error.message:"Inference request failed";
    errors.push(`${provider} attempt ${attempt}: ${message}`);
    if(provider==="evren"&&attempt<maxAttempts&&message.toLowerCase().includes("503")){await new Promise(resolve=>setTimeout(resolve,700));continue}
    break;
   }finally{clearTimeout(timeout)}
  }
 }
 console.error("buildpulse_chat_providers_exhausted",{providers:available,errors});
 return Response.json({error:"AI providers are temporarily unavailable. Please try again shortly."},{status:502});
}
