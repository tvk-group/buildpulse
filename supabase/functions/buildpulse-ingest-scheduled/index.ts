import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";

const jsonHeaders={"Content-Type":"application/json"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:jsonHeaders});
const clean=(s:string)=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/\s+/g," ").trim();
const tag=(block:string,names:string[])=>{for(const n of names){const m=block.match(new RegExp("<"+n+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+n+">","i"));if(m)return clean(m[1])}return ""};
const safeUrl=(value:string)=>{try{const u=new URL(value);if(u.protocol!=="https:"||u.username||u.password)return false;const h=u.hostname.toLowerCase();if(h==="localhost"||h.endsWith(".local")||h.endsWith(".internal"))return false;if(/^127\.|^10\.|^192\.168\.|^169\.254\./.test(h))return false;return true}catch{return false}};
function parseXml(xml:string){const blocks=xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi)??[];return blocks.map(block=>{let url=tag(block,["link","guid"]);const href=block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);if(href)url=clean(href[1]);return {url,title:tag(block,["title"]),summary:tag(block,["description","summary","content"]).slice(0,700),publishedAt:tag(block,["pubDate","published","updated"])};}).filter(x=>x.title&&safeUrl(x.url))}
function parseJson(body:any){const items=Array.isArray(body?.items)?body.items:Array.isArray(body?.articles)?body.articles:Array.isArray(body?.data)?body.data:[];return items.map((x:any)=>({url:String(x?.url||x?.link||"").trim(),title:String(x?.title||"").trim(),summary:String(x?.summary||x?.description||x?.excerpt||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,700),publishedAt:String(x?.date_published||x?.published_at||x?.publishedAt||"").trim()})).filter((x:any)=>x.title&&safeUrl(x.url))}
async function sha256(value:string){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
const normalize=(s:string)=>s.toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();

Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return reply({ok:false,error:"method_not_allowed"},405);
 const url=Deno.env.get("SUPABASE_URL")??"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
 if(!url||!service)return reply({ok:false,error:"service_not_configured"},503);
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:setting}=await admin.from("buildpulse_private_settings").select("value").eq("key","ingest_scheduler_secret").maybeSingle();
 const supplied=req.headers.get("x-buildpulse-scheduler-secret")??"";
 if(!setting?.value||supplied!==setting.value)return reply({ok:false,error:"unauthorized"},401);
 const {data:run}=await admin.from("buildpulse_job_runs").insert({job_name:"ingest-supabase-fallback",status:"running"}).select("id").single();
 let discovered=0,accepted=0,rejected=0,verified=0;const failures:string[]=[];const sourceStats:Array<Record<string,unknown>>=[];
 try{
  const {data:sources,error:sourceError}=await admin.from("buildpulse_sources").select("id,name,feed_url,category,trust_tier,enabled").eq("enabled",true).not("feed_url","is",null);
  if(sourceError)throw sourceError;
  for(const source of sources??[]){
   try{
    if(!safeUrl(source.feed_url))throw new Error("unsafe_feed_url");
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    let response:Response;try{response=await fetch(source.feed_url,{headers:{accept:"application/feed+json, application/json, application/rss+xml, application/atom+xml, application/xml, text/xml","user-agent":"BuildPulse/1.0 (+https://buildpulse.news/methodology)"},signal:controller.signal,redirect:"follow"})}finally{clearTimeout(timer)}
    if(!response.ok)throw new Error("source_http_"+response.status);
    const contentType=(response.headers.get("content-type")??"").toLowerCase();
    const text=await response.text();if(text.length>2_000_000)throw new Error("source_too_large");
    let items:any[]=[];if(contentType.includes("json"))items=parseJson(JSON.parse(text));else items=parseXml(text);
    discovered+=items.length;
    const beforeAccepted=accepted,beforeRejected=rejected;
    for(const item of items.slice(0,100)){
      const normalized=normalize(item.title),hash=await sha256(normalized+"|"+item.summary);
      const {data:urlDupe,error:urlDupeError}=await admin.from("buildpulse_stories").select("id").eq("canonical_url",item.url).limit(1).maybeSingle();
      if(urlDupeError)throw urlDupeError;
      let dupe=Boolean(urlDupe);
      if(!dupe){const {data:hashDupe,error:hashDupeError}=await admin.from("buildpulse_stories").select("id").eq("content_hash",hash).limit(1).maybeSingle();if(hashDupeError)throw hashDupeError;dupe=Boolean(hashDupe)}
      if(dupe){rejected++;continue}
      const published=Number.isFinite(Date.parse(item.publishedAt))?new Date(item.publishedAt).toISOString():null;
      const age=published?Math.max(0,(Date.now()-Date.parse(published))/3600000):72,freshness=Math.max(0,100-age*2);
      const score=Math.max(0,Math.min(100,Math.round(100*0.35+freshness*0.30+50*0.20+50*0.10)));
      const autoVerified=Number(source.trust_tier)===1;
      const {error:insertError}=await admin.from("buildpulse_stories").insert({
        canonical_url:item.url,canonical_source_url:item.url,source_id:source.id,title:item.title,normalized_title:normalized,
        summary:item.summary||null,category:source.category??"world",published_at:published,source_payload:{format:contentType.includes("json")?"json":"xml",ingested_by:"supabase-fallback-v1"},
        content_hash:hash,verification_state:autoVerified?"verified":"pending",editorial_score:score,corroboration_count:0,
        verified_at:autoVerified?new Date().toISOString():null,verified_by:autoVerified?"automated-tier1-source-provenance-v1":null,
        verification_notes:autoVerified?"Direct item from configured Tier-1 source feed; provenance verified, not independently corroborated.":null
      });
      if(insertError){if(insertError.code==="23505")rejected++;else throw insertError}else{accepted++;if(autoVerified)verified++}
    }
    sourceStats.push({name:source.name,contentType,parsed:items.length,itemMarkers:(text.match(/<item\b/gi)??[]).length,entryMarkers:(text.match(/<entry\b/gi)??[]).length,eligible:items.slice(0,100).length,accepted:accepted-beforeAccepted,rejected:rejected-beforeRejected});
    await admin.from("buildpulse_sources").update({last_fetched_at:new Date().toISOString(),last_fetch_status:"ok",last_fetch_error:null}).eq("id",source.id);
   }catch(e){const m=e instanceof Error?e.message:"unknown";failures.push(source.name+": "+m);await admin.from("buildpulse_sources").update({last_fetched_at:new Date().toISOString(),last_fetch_status:"failed",last_fetch_error:m.slice(0,500)}).eq("id",source.id)}
  }
  const metrics={sources:(sources??[]).length,discovered,accepted,rejected,verified,failures,sourceStats};
  if(run?.id)await admin.from("buildpulse_job_runs").update({status:"ok",metrics,finished_at:new Date().toISOString(),error:null}).eq("id",run.id);
  return reply({ok:true,...metrics});
 }catch(e){const m=e instanceof Error?e.message:"unknown";if(run?.id)await admin.from("buildpulse_job_runs").update({status:"failed",finished_at:new Date().toISOString(),error:m.slice(0,2000)}).eq("id",run.id);return reply({ok:false,error:m},500)}
});