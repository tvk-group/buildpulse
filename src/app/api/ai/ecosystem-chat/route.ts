import {NextRequest} from "next/server";
import {ecosystemContext} from "@/lib/buildpulse/ecosystem-knowledge";
import {repositoryContext} from "@/lib/buildpulse/ecosystem-repositories";
export const runtime="nodejs"; export const dynamic="force-dynamic";
type ChatMessage={role:"user"|"assistant";content:string}; type Bucket={count:number;reset:number};
const ENDPOINT=(process.env.NVIDIA_AI_BASE_URL||"https://integrate.api.nvidia.com/v1").replace(/\/$/,"");
const DEFAULT_MODEL=process.env.NVIDIA_AI_MODEL||"openai/gpt-oss-20b";
const buckets=new Map<string,Bucket>(), WINDOW_MS=60_000, MAX_REQUESTS=Math.max(1,Number(process.env.BUILDPULSE_AI_ECOSYSTEM_RPM||process.env.BUILDPULSE_AI_RPM||"12"));
const ROOTS=["buildpulse.news","sovraprotocol.com","sovra.network","entelekron.io","entelekron.org","entelekron.com","entelewallet.app","entelewallet.org","entelewallet.com","enteleexchange.com","entelepay.com","entelepoint.com","opsline.org","tvk.group","tvklabs.com","tvkaerospace.com","asodi.systems","osoix.com","tvkwallet.com","tvkusd.com","enm.network","energiemand.com"];
const allowed=(origin:string|null)=>{if(!origin)return null;try{const u=new URL(origin),h=u.hostname.toLowerCase();return ROOTS.some(r=>h===r||h.endsWith("."+r))?u.origin:null}catch{return null}};
const cors=(origin:string|null)=>{const a=allowed(origin);return {"Access-Control-Allow-Origin":a||"https://buildpulse.news","Vary":"Origin","Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type","Cache-Control":"no-store"}};
function clientKey(req:NextRequest){return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||req.headers.get("x-real-ip")||"anonymous"}
function limited(key:string){const now=Date.now(),v=buckets.get(key);if(!v||v.reset<=now){buckets.set(key,{count:1,reset:now+WINDOW_MS});return false}v.count++;return v.count>MAX_REQUESTS}
function clean(v:unknown):ChatMessage[]{if(!Array.isArray(v))return[];return v.filter((m):m is ChatMessage=>!!m&&typeof m==="object"&&((m as ChatMessage).role==="user"||(m as ChatMessage).role==="assistant")&&typeof (m as ChatMessage).content==="string").slice(-16).map(m=>({role:m.role,content:m.content.trim().slice(0,12000)})).filter(m=>m.content)}
export async function OPTIONS(req:NextRequest){return new Response(null,{status:204,headers:cors(req.headers.get("origin"))})}
export async function POST(req:NextRequest){
 const origin=req.headers.get("origin"), headers=cors(origin); if(origin&&!allowed(origin))return Response.json({error:"Origin not allowed."},{status:403,headers});
 const key=process.env.NVIDIA_API_KEY;if(!key)return Response.json({error:"SOVRA AI is temporarily unavailable."},{status:503,headers});
 if(limited(clientKey(req)))return Response.json({error:"AI limit reached. Please wait briefly."},{status:429,headers:{...headers,"Retry-After":"60"}});
 let body:{messages?:unknown;site?:unknown;path?:unknown};try{body=await req.json()}catch{return Response.json({error:"Invalid request."},{status:400,headers})}
 const messages=clean(body.messages);if(!messages.length)return Response.json({error:"Enter a message first."},{status:400,headers});
 const site=String(body.site||"TVK ecosystem").slice(0,120), path=String(body.path||"/").slice(0,500), latest=[...messages].reverse().find(m=>m.role==="user")?.content||"";
 const knowledge=[ecosystemContext(latest),repositoryContext(latest)].filter(Boolean).join("\n\n");
 const system=`You are SOVRA AI, the shared AI guide for TVK Labs & Technologies LTD ecosystem websites. Current site: ${site}. Current path: ${path}. Help the visitor understand and navigate the current product, answer questions, write, reason, plan and debug. Never claim you can see, track, profile or silently observe the visitor. Do not claim to be human, conscious or sentient. Do not invent audits, partnerships, regulatory approvals, listings, production readiness or security guarantees. When the current site's own facts conflict with generic ecosystem context, be cautious and say what is not established.${knowledge?"\n\nCanonical ecosystem context:\n"+knowledge:""}`;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
 try{const upstream=await fetch(ENDPOINT+"/chat/completions",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${key}`},body:JSON.stringify({model:DEFAULT_MODEL,messages:[{role:"system",content:system},...messages],max_tokens:1800,stream:false}),cache:"no-store",signal:controller.signal});const d=await upstream.json().catch(()=>null);if(!upstream.ok)return Response.json({error:d?.error?.message||d?.message||"AI request failed."},{status:upstream.status,headers});const content=d?.choices?.[0]?.message?.content;if(typeof content!=="string"||!content.trim())return Response.json({error:"AI returned no answer."},{status:502,headers});return Response.json({content,provider:"NVIDIA",model:d?.model||DEFAULT_MODEL},{headers})}
 catch(e){return Response.json({error:e instanceof Error&&e.name==="AbortError"?"AI request timed out.":"AI is temporarily unavailable."},{status:e instanceof Error&&e.name==="AbortError"?504:502,headers})}finally{clearTimeout(timer)}
}
