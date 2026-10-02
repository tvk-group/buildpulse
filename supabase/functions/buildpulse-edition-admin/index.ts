import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";

const HEADERS={"Content-Type":"application/json","Cache-Control":"no-store"};
function reply(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:HEADERS})}
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]??c));
function httpsUrl(value:string|null|undefined){try{const u=new URL(value??"");return u.protocol==="https:"?u.toString():null}catch{return null}}
async function context(req:Request){
 const url=Deno.env.get("SUPABASE_URL")??"",anon=Deno.env.get("SUPABASE_ANON_KEY")??"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
 const authorization=req.headers.get("Authorization")??"";
 if(!url||!anon||!service)throw new Error("service_not_configured");
 if(!authorization.startsWith("Bearer "))throw new Error("authentication_required");
 const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await userClient.auth.getUser();if(error||!user)throw new Error("authentication_required");
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:role}=await admin.from("role_assignments").select("id").eq("user_id",user.id).eq("role","admin").is("revoked_at",null).limit(1).maybeSingle();
 if(!role)throw new Error("admin_required");
 return {user,admin};
}
function balanced(candidates:any[],limit:number,perSource:number){
 const selected:any[]=[],counts=new Map<string,number>();
 for(const s of candidates){const k=s.source_id??"unknown",n=counts.get(k)??0;if(n>=perSource)continue;selected.push(s);counts.set(k,n+1);if(selected.length===limit)return selected}
 const ids=new Set(selected.map(s=>s.id));
 for(const s of candidates){if(ids.has(s.id))continue;selected.push(s);if(selected.length===limit)break}
 return selected;
}
function subject(type:"daily"|"weekly",titles:string[]){return type==="daily"?`BuildPulse Daily — ${titles[0]??"Digital intelligence briefing"}`:`BuildPulse Weekly — ${titles[0]??"The week in digital intelligence"}`}
async function compose(admin:any,edition:any){
 const {data:links,error}=await admin.from("buildpulse_edition_stories")
  .select("section,position,story_id").eq("edition_id",edition.id).order("position");
 if(error)throw error;
 const storyIds=(links??[]).map((x:any)=>x.story_id);
 const {data:stories}=storyIds.length?await admin.from("buildpulse_stories")
  .select("id,title,summary,canonical_source_url,verification_state,verified_at,verified_by").in("id",storyIds):{data:[]};
 const map=new Map((stories??[]).map((s:any)=>[s.id,s]));
 const rows=(links??[]).map((l:any)=>({...l,story:map.get(l.story_id)}))
   .filter((x:any)=>x.story?.verification_state==="verified"&&x.story.verified_at&&x.story.verified_by&&x.story.canonical_source_url);
 if(!rows.length)throw new Error("edition_has_no_verified_stories");
 const blocks=rows.map((x:any)=>{
   const source=httpsUrl(x.story.canonical_source_url);
   return `<section><p style="font:700 12px Arial;letter-spacing:.12em;text-transform:uppercase;color:#64748b">${esc(x.section)}</p><h2 style="font:700 24px Arial;color:#0f172a">${esc(x.story.title)}</h2><p style="font:16px/1.65 Arial;color:#334155">${esc(x.story.summary??"")}</p>${source?`<p><a href="${esc(source)}">Read source</a></p>`:""}</section>`;
 }).join("");
 const now=new Date().toISOString();
 const {data:newsletterProducts}=await admin.from("buildpulse_ad_products").select("id").eq("placement","newsletter").eq("active",true);
 const productIds=(newsletterProducts??[]).map((p:any)=>p.id);
 const {data:sponsor}=productIds.length?await admin.from("buildpulse_ad_orders").select("headline,copy_text,destination_url").eq("status","active").in("product_id",productIds).lte("starts_at",now).gte("ends_at",now).order("created_at",{ascending:true}).limit(1).maybeSingle():{data:null};
 const sponsorUrl=httpsUrl(sponsor?.destination_url);
 const sponsorBlock=sponsor&&sponsorUrl?`<aside style="margin:32px 0;padding:20px;border:1px solid #cbd5e1;border-radius:14px"><p style="font:700 10px Arial;letter-spacing:.16em;color:#64748b">ADVERTISEMENT</p>${sponsor.headline?`<h3 style="font:700 19px Arial;color:#0f172a">${esc(sponsor.headline)}</h3>`:""}${sponsor.copy_text?`<p style="font:14px/1.6 Arial;color:#475569">${esc(sponsor.copy_text)}</p>`:""}<p><a rel="sponsored" href="${esc(sponsorUrl)}">Visit sponsor</a></p></aside>`:"";
 const {data:affiliateRows}=await admin.from("buildpulse_affiliate_links").select("label,destination_url,disclosure").eq("active",true).limit(5);
 const affiliates=(affiliateRows??[]).map((x:any)=>({label:x.label,url:httpsUrl(x.destination_url),disclosure:x.disclosure})).filter((x:any)=>x.url);
 const affiliateBlock=affiliates.length?`<aside style="margin:32px 0;padding:20px;background:#f8fafc;border-radius:14px"><p style="font:700 10px Arial;letter-spacing:.16em;color:#64748b">AFFILIATE DISCLOSURE</p><p style="font:12px/1.6 Arial;color:#64748b">BuildPulse may receive compensation when a reader uses a disclosed affiliate link. This does not alter editorial verification.</p><ul>${affiliates.map((x:any)=>`<li><a rel="sponsored" href="${esc(x.url)}">${esc(x.label)}</a> - ${esc(x.disclosure)}</li>`).join("")}</ul></aside>`:"";
 return `<!doctype html><html><body style="margin:0;background:#f8fafc"><main style="max-width:720px;margin:auto;padding:40px 24px;background:white"><p style="font:700 12px Arial;letter-spacing:.18em">TVK BUILDPULSE</p><h1 style="font:800 38px Arial;color:#0f172a">${esc(edition.subject)}</h1><p style="font:16px Arial;color:#64748b">${esc(edition.preheader??"Global Technology & Digital Intelligence")}</p>${blocks}${sponsorBlock}${affiliateBlock}<hr/><p style="font:12px/1.5 Arial;color:#64748b">BuildPulse separates sourced reporting from TVK/EnteleKRON ecosystem updates. Commercial placements are labeled and do not determine editorial verification.</p></main></body></html>`;
}
async function build(admin:any,type:"daily"|"weekly"){
 const limit=type==="daily"?8:14,since=new Date(Date.now()-(type==="daily"?36:24*8)*3600000).toISOString();
 const {data:stories,error}=await admin.from("buildpulse_stories")
   .select("id,title,category,source_id,editorial_score,published_at,verified_at,verified_by,canonical_source_url")
   .eq("verification_state","verified").gte("published_at",since).order("editorial_score",{ascending:false}).limit(limit*5);
 if(error)throw error;
 const date=new Date().toISOString().slice(0,10),slug=`${type}-${date}`;
 if(!(stories??[]).length)return {ok:true,skipped:true,reason:"no_verified_stories",slug,storyCount:0};
 const selected=balanced(stories??[],limit,type==="daily"?2:3);
 if(selected.some((s:any)=>!s.verified_at||!s.verified_by||!s.canonical_source_url))throw new Error("verified_story_missing_provenance");
 const {data:existing}=await admin.from("buildpulse_editions").select("id,status,revision_number").eq("edition_type",type).eq("locale","en").eq("slug",slug).maybeSingle();
 if(existing)return {ok:true,skipped:true,reason:"generation_already_claimed",editionId:existing.id,slug,status:existing.status,revision:existing.revision_number};
 const titles=selected.map((x:any)=>x.title);
 const {data:edition,error:insertError}=await admin.from("buildpulse_editions").insert({
   edition_type:type,locale:"en",subject:subject(type,titles),
   preheader:type==="daily"?"The essential AI, blockchain, markets and security signal.":"The week's connected view across digital infrastructure.",
   slug,status:"draft",generation_key:`${type}:en:${date}`,generation_started_at:new Date().toISOString(),
   generation_metadata:{strategy:"verified-score-source-balanced-v3-edge",generatedAt:new Date().toISOString(),storyCount:selected.length}
 }).select("*").single();
 if(insertError||!edition)throw insertError??new Error("edition_create_failed");
 let position=0;
 for(const s of selected){
   const {error:e}=await admin.from("buildpulse_edition_stories").insert({edition_id:edition.id,story_id:s.id,section:s.category||"lead",position:position++});
   if(e)throw e;
 }
 const html=await compose(admin,edition);
 const revision=Number(edition.revision_number??1);
 const now=new Date().toISOString();
 const {error:u}=await admin.from("buildpulse_editions").update({
   body_html:html,status:"review",founder_review_status:"pending",founder_review_notes:null,founder_approved_revision:null,
   approved_at:null,approved_by:null,generation_completed_at:now,generation_error:null,updated_at:now
 }).eq("id",edition.id).eq("status","draft");
 if(u)throw u;
 return {ok:true,skipped:false,editionId:edition.id,slug,storyCount:selected.length,revision,status:"review"};
}
async function list(admin:any){
 const {data,error}=await admin.from("buildpulse_editions")
  .select("id,edition_type,subject,preheader,slug,status,revision_number,founder_review_status,founder_review_notes,founder_approved_revision,scheduled_at,published_at,created_at,updated_at,generation_error")
  .order("created_at",{ascending:false}).limit(100);
 if(error)throw error;return data??[];
}
async function editionAction(admin:any,user:any,body:any){
 const id=String(body.editionId??""),op=String(body.editionAction??"");
 if(!/^[0-9a-f-]{36}$/i.test(id)||!["approve","changes","schedule"].includes(op))throw new Error("invalid_request");
 const {data:e,error}=await admin.from("buildpulse_editions").select("*").eq("id",id).maybeSingle();if(error||!e)throw new Error("edition_not_found");
 const actor=user.email??user.id,now=new Date().toISOString();
 if(op==="approve"){
   if(e.status!=="review"||!e.body_html)throw new Error("edition_not_reviewable");
   const {error:u}=await admin.from("buildpulse_editions").update({
     status:"approved",founder_review_status:"approved",founder_approved_revision:e.revision_number,
     founder_reviewed_at:now,approved_at:now,approved_by:actor,founder_review_notes:null,updated_at:now
   }).eq("id",id).eq("revision_number",e.revision_number).eq("status","review");
   if(u)throw u;
   await admin.from("buildpulse_review_events").insert({edition_id:id,action:"approve",actor,notes:`Approved revision ${e.revision_number}`});
   return {ok:true,state:"approved",revision:e.revision_number};
 }
 if(op==="changes"){
   const notes=typeof body.notes==="string"?body.notes.trim().slice(0,10000):"";
   if(e.status!=="review"||notes.length<3)throw new Error("change_directives_required");
   const {error:u}=await admin.from("buildpulse_editions").update({
     founder_review_status:"changes_requested",founder_review_notes:notes,founder_reviewed_at:now,updated_at:now
   }).eq("id",id).eq("revision_number",e.revision_number).eq("status","review");
   if(u)throw u;
   await admin.from("buildpulse_review_events").insert({edition_id:id,action:"changes_requested",actor,notes});
   return {ok:true,state:"changes_requested",revision:e.revision_number};
 }
 const when=new Date(String(body.scheduledAt??""));
 if(e.status!=="approved"||e.founder_review_status!=="approved"||e.founder_approved_revision!==e.revision_number)throw new Error("current_revision_approval_required");
 if(Number.isNaN(when.getTime())||when.getTime()<Date.now()-60_000)throw new Error("valid_schedule_required");
 const {error:u}=await admin.from("buildpulse_editions").update({status:"scheduled",scheduled_at:when.toISOString(),updated_at:now}).eq("id",id).eq("status","approved");
 if(u)throw u;
 return {ok:true,state:"scheduled",scheduledAt:when.toISOString()};
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type"}});
 if(req.method!=="POST")return reply({ok:false,error:"method_not_allowed"},405);
 try{
   const {user,admin}=await context(req),body=await req.json().catch(()=>null);
   if(!body||typeof body!=="object")return reply({ok:false,error:"invalid_request"},400);
   const action=String(body.action??"");
   if(action==="build"){const type=body.type==="weekly"?"weekly":"daily";return reply(await build(admin,type))}
   if(action==="list")return reply({ok:true,editions:await list(admin)});
   if(action==="edition")return reply(await editionAction(admin,user,body));
   return reply({ok:false,error:"unsupported_action"},400);
 }catch(error){
   const message=error instanceof Error?error.message:"edition_operation_failed";
   const status=message==="authentication_required"?401:message==="admin_required"?403:
     ["invalid_request","change_directives_required","valid_schedule_required"].includes(message)?400:
     message==="edition_not_found"?404:
     ["edition_not_reviewable","current_revision_approval_required"].includes(message)?409:500;
   return reply({ok:false,error:message},status);
 }
});