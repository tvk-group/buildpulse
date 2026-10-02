import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";

const HEADERS={"Content-Type":"application/json","Cache-Control":"no-store"};
function reply(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:HEADERS})}
function privateHost(host:string){
  const h=host.toLowerCase();
  return h==="localhost"||h.endsWith(".localhost")||/^127\.|^10\.|^192\.168\.|^169\.254\.|^0\./.test(h)||/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)||h==="::1"||/^fc|^fd|^fe[89ab]/i.test(h);
}
async function safeHttps(raw:string){
  let u:URL;try{u=new URL(raw)}catch{return false}
  if(u.protocol!=="https:"||u.username||u.password||privateHost(u.hostname))return false;
  try{
    const [a,aaaa]=await Promise.allSettled([Deno.resolveDns(u.hostname,"A"),Deno.resolveDns(u.hostname,"AAAA")]);
    const ips=[...(a.status==="fulfilled"?a.value:[]),...(aaaa.status==="fulfilled"?aaaa.value:[])];
    if(!ips.length||ips.some(privateHost))return false;
  }catch{return false}
  return true;
}
async function context(req:Request){
  const url=Deno.env.get("SUPABASE_URL")??"",anon=Deno.env.get("SUPABASE_ANON_KEY")??"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  const authorization=req.headers.get("Authorization")??"";
  if(!url||!anon||!service)throw new Error("service_not_configured");
  if(!authorization.startsWith("Bearer "))throw new Error("authentication_required");
  const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await userClient.auth.getUser();
  if(error||!user)throw new Error("authentication_required");
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:role}=await admin.from("role_assignments").select("id").eq("user_id",user.id).eq("role","admin").is("revoked_at",null).limit(1).maybeSingle();
  if(!role)throw new Error("admin_required");
  return {user,admin};
}
async function queue(admin:any,body:any){
  const page=Math.max(1,Math.min(10000,Number(body.page)||1)),size=50,from=(page-1)*size;
  const source=typeof body.source==="string"?body.source.trim().slice(0,120):"";
  let q=admin.from("buildpulse_stories")
    .select("id,title,summary,canonical_url,published_at,source_id,verification_state,editorial_score",{count:"exact"})
    .in("verification_state",["pending","needs_review"]);
  if(source){
    const {data:sources,error:se}=await admin.from("buildpulse_sources").select("id").eq("name",source);
    if(se)throw se;
    const ids=(sources??[]).map((s:any)=>s.id);
    if(!ids.length)return {stories:[],total:0,page,pages:1};
    q=q.in("source_id",ids);
  }
  const {data,error,count}=await q.order("editorial_score",{ascending:false,nullsFirst:false}).order("published_at",{ascending:false}).range(from,from+size-1);
  if(error)throw error;
  const sourceIds=[...new Set((data??[]).map((s:any)=>s.source_id).filter(Boolean))];
  const {data:sources}=sourceIds.length?await admin.from("buildpulse_sources").select("id,name").in("id",sourceIds):{data:[]};
  const sourceMap=new Map((sources??[]).map((s:any)=>[s.id,s.name]));
  const total=count??0,pages=Math.max(1,Math.ceil(total/size));
  return {stories:(data??[]).map((s:any)=>({...s,source_name:sourceMap.get(s.source_id)??"Source"})),total,page,pages};
}
async function review(admin:any,user:any,body:any){
  const storyId=String(body.storyId??""),action=String(body.reviewAction??body.decision??"");
  const notes=typeof body.notes==="string"?body.notes.trim():"";
  const canonical=typeof body.canonicalSourceUrl==="string"?body.canonicalSourceUrl.trim():"";
  const evidence=Array.isArray(body.evidence)?body.evidence.slice(0,20):[];
  if(!/^[0-9a-f-]{36}$/i.test(storyId)||!["verify","reject"].includes(action)||notes.length<3||notes.length>4000)throw new Error("invalid_review");
  const {data:story,error}=await admin.from("buildpulse_stories").select("id,verification_state,canonical_url").eq("id",storyId).maybeSingle();
  if(error||!story)throw new Error("story_not_found");
  if(!["pending","needs_review"].includes(story.verification_state))throw new Error("story_already_reviewed");
  const reviewer=(user.email??user.id).toLowerCase();

  if(action==="reject"){
    const {error:u}=await admin.from("buildpulse_stories").update({
      verification_state:"rejected",verification_notes:notes,verified_at:null,verified_by:reviewer,canonical_source_url:null
    }).eq("id",storyId).in("verification_state",["pending","needs_review"]);
    if(u)throw u;
    const {error:audit}=await admin.from("buildpulse_review_events").insert({story_id:storyId,action:"reject",actor:reviewer,notes});
    if(audit)throw audit;
    return {ok:true,state:"rejected",evidenceCount:0,reviewedBy:reviewer};
  }

  const canonicalUrl=canonical||story.canonical_url;
  if(!await safeHttps(canonicalUrl))throw new Error("unsafe_evidence_url");
  const normalized:any[]=[];
  for(const item of evidence){
    const url=typeof item?.url==="string"?item.url.trim():"";
    const kind=["primary","supporting","contradicting"].includes(item?.kind)?item.kind:"supporting";
    if(!url||!await safeHttps(url))throw new Error("unsafe_evidence_url");
    normalized.push({url,kind,name:typeof item?.name==="string"?item.name.trim().slice(0,200):null,notes:typeof item?.notes==="string"?item.notes.trim().slice(0,1000):null});
  }
  const supporting=normalized.filter(x=>x.kind!=="contradicting");
  const now=new Date().toISOString();
  const {error:u}=await admin.from("buildpulse_stories").update({
    verification_state:"verified",verified_at:now,verified_by:reviewer,canonical_source_url:canonicalUrl,
    verification_notes:notes,corroboration_count:supporting.length
  }).eq("id",storyId).in("verification_state",["pending","needs_review"]);
  if(u)throw u;

  const entries=[{story_id:storyId,source_url:canonicalUrl,source_name:null,source_kind:"primary",notes:"Canonical verification source"},
    ...normalized.filter(x=>x.url!==canonicalUrl).map(x=>({story_id:storyId,source_url:x.url,source_name:x.name,source_kind:x.kind,notes:x.notes}))];
  for(const entry of entries){
    const {error:e}=await admin.from("buildpulse_story_evidence").upsert(entry,{onConflict:"story_id,source_url"});
    if(e)throw e;
  }
  const {error:audit}=await admin.from("buildpulse_review_events").insert({story_id:storyId,action:"verify",actor:reviewer,notes});
  if(audit)throw audit;
  return {ok:true,state:"verified",evidenceCount:normalized.length,reviewedBy:reviewer};
}
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type"}});
  if(req.method!=="POST")return reply({ok:false,error:"method_not_allowed"},405);
  try{
    const {user,admin}=await context(req);
    const body=await req.json().catch(()=>null);
    if(!body||typeof body!=="object")return reply({ok:false,error:"invalid_request"},400);
    const action=String(body.action??"");
    if(action==="queue")return reply({ok:true,...await queue(admin,body)});
    if(action==="review")return reply(await review(admin,user,body));
    return reply({ok:false,error:"unsupported_action"},400);
  }catch(error){
    const message=error instanceof Error?error.message:"editorial_operation_failed";
    const status=message==="authentication_required"?401:message==="admin_required"?403:
      ["invalid_request","invalid_review","unsafe_evidence_url"].includes(message)?400:
      message==="story_not_found"?404:message==="story_already_reviewed"?409:500;
    return reply({ok:false,error:message},status);
  }
});