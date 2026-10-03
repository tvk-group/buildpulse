import {NextRequest} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

type ChatMessage={role:"user"|"assistant";content:string};

const MODEL=process.env.NVIDIA_AI_MODEL||"openai/gpt-oss-20b";
const ENDPOINT=(process.env.NVIDIA_AI_BASE_URL||"https://integrate.api.nvidia.com/v1").replace(/\/$/,"");

export async function POST(req:NextRequest){
  const apiKey=process.env.NVIDIA_API_KEY;
  if(!apiKey)return Response.json({error:"BuildPulse AI is not activated yet. NVIDIA_API_KEY is missing."},{status:503});
  let body:{messages?:ChatMessage[]};
  try{body=await req.json()}catch{return Response.json({error:"Invalid request."},{status:400})}
  const messages=(body.messages||[]).filter(m=>(m.role==="user"||m.role==="assistant")&&typeof m.content==="string").slice(-16).map(m=>({role:m.role,content:m.content.slice(0,12000)}));
  if(!messages.length)return Response.json({error:"Enter a message first."},{status:400});
  const upstream=await fetch(`${ENDPOINT}/chat/completions`,{
    method:"POST",
    headers:{"content-type":"application/json","authorization":`Bearer ${apiKey}`},
    body:JSON.stringify({model:MODEL,messages,max_tokens:2048,stream:false}),
    cache:"no-store",
  });
  const data=await upstream.json().catch(()=>null);
  if(!upstream.ok)return Response.json({error:data?.detail||data?.message||data?.error?.message||"AI provider request failed."},{status:upstream.status});
  const content=data?.choices?.[0]?.message?.content;
  if(typeof content!=="string")return Response.json({error:"AI provider returned no answer."},{status:502});
  return Response.json({content,model:data?.model||MODEL,provider:"NVIDIA"});
}
