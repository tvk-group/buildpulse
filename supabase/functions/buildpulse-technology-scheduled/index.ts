import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2";
const topics=["ai","cybersecurity","developer-infrastructure","blockchain-infrastructure","digital-economy"] as const;
const terms:Record<string,string[]>={ai:["artificial intelligence"," ai ","machine learning","foundation model","llm"],cybersecurity:["cybersecurity","cyber security","ransomware","malware","vulnerability","security breach"],"developer-infrastructure":["developer","software","cloud","data center","datacenter","server","infrastructure","open source"],"blockchain-infrastructure":["blockchain","distributed ledger","layer 2","rollup","validator","smart contract"],"digital-economy":["digital economy","fintech","payments","e-commerce","digital asset","platform economy"]};
const json=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json"}});
const slug=(v:string)=>v.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,88);
Deno.serve(async(req)=>{
 const url=Deno.env.get("SUPABASE_URL")!,key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 const db=createClient(url,key,{auth:{persistSession:false}});
 const supplied=req.headers.get("x-buildpulse-scheduler-secret")||"";
 const {data:setting}=await db.from("buildpulse_private_settings").select("value").eq("key","technology_scheduler_secret").maybeSingle();
 if(!setting?.value||supplied!==setting.value)return json({ok:false,error:"unauthorized"},401);
 const started=new Date().toISOString();
 const {data:run}=await db.from("buildpulse_job_runs").insert({job_name:"technology-editorial-supabase",status:"running",started_at:started}).select("id").single();
 try{
  const {data:agent}=await db.from("buildpulse_agents").select("enabled").eq("code","technology-editorial").maybeSingle();
  if(!agent?.enabled)throw new Error("technology_editorial_agent_disabled");
  const {data:priorRuns}=await db.from("buildpulse_job_runs").select("metrics").eq("job_name","technology-editorial-supabase").neq("id",run?.id||"").order("started_at",{ascending:false}).limit(20);
  const previous=String(((priorRuns||[]).find((x:any)=>topics.includes(x?.metrics?.topic))?.metrics as any)?.topic||"");
  const idx=topics.indexOf(previous as any),topic=topics[(idx+1+topics.length)%topics.length];
  const since=new Date(Date.now()-7*86400000).toISOString();
  const {data:stories,error}=await db.from("buildpulse_stories").select("id,title,summary,category,canonical_source_url,published_at,verified_at,verified_by").eq("verification_state","verified").not("canonical_source_url","is",null).not("verified_at","is",null).not("verified_by","is",null).gte("published_at",since).order("editorial_score",{ascending:false}).limit(100);
  if(error)throw error;
  const rel=(stories||[]).filter((s:any)=>terms[topic].some(t=>(" "+String(s.title||"")+" "+String(s.summary||"")+" "+String(s.category||"")+" ").toLowerCase().includes(t))).filter((s:any)=>/^https?:\/\//i.test(String(s.canonical_source_url||""))).slice(0,10);
  if(rel.length<2){const metrics={skipped:true,reason:"insufficient_verified_external_sources",topic,sources:rel.length};if(run?.id)await db.from("buildpulse_job_runs").update({status:"ok",finished_at:new Date().toISOString(),metrics}).eq("id",run.id);return json({ok:true,...metrics})}
  const sourceText=rel.map((s:any,i:number)=>"[VERIFIED SOURCE "+(i+1)+"] "+s.title+"\nSummary: "+(s.summary||"")+"\nSource: "+s.canonical_source_url).join("\n\n");
  const prompt="Act as BuildPulse Technology Editorial Agent. Write independent, source-grounded technology journalism about "+topic+". BuildPulse is a standalone newsroom: do not promote TVK, ENTELΞKRON, SOVRA, token sales, or affiliated products unless they are independently newsworthy and directly supported by the supplied verified sources. Never invent audits, partnerships, prices, performance, regulatory status, security guarantees, or roadmap completion. Use ONLY the supplied verified source material. Output exactly TITLE:, DEK:, BODY:. BODY should be concise Markdown of 180-260 words with descriptive subheadings and end with a Sources section containing only supplied source URLs.\n\n"+sourceText;
  const ai=await fetch("https://www.buildpulse.news/api/ai/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:prompt}]})});
  const out=await ai.json();if(!ai.ok||!out?.content)throw new Error("ai_"+ai.status);
  const text=String(out.content),title=text.match(/^\s*(?:\*\*)?TITLE:(?:\*\*)?\s*(.+)$/mi)?.[1]?.replace(/\*\*$/,"").trim(),dek=text.match(/^\s*(?:\*\*)?DEK:(?:\*\*)?\s*(.+)$/mi)?.[1]?.replace(/\*\*$/,"").trim()||null,body=text.split(/^\s*(?:\*\*)?BODY:(?:\*\*)?\s*$/mi)[1]?.trim();
  if(!title||!body)throw new Error("invalid_article_format");
  const day=new Date().toISOString().slice(0,10),generationKey=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(topic+"|neutral-v2|"+rel.map((s:any)=>s.id).join("|")+"|"+day)).then(b=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join(""));
  const {data:existing}=await db.from("buildpulse_technology_articles").select("id").eq("generation_key",generationKey).maybeSingle();
  if(existing){const metrics={skipped:true,reason:"already_generated",topic};if(run?.id)await db.from("buildpulse_job_runs").update({status:"ok",finished_at:new Date().toISOString(),metrics}).eq("id",run.id);return json({ok:true,...metrics})}
  const {data:article,error:write}=await db.from("buildpulse_technology_articles").insert({slug:slug(title)+"-"+topic+"-"+day+"-"+generationKey.slice(0,8),topic,title,dek,body_markdown:body,status:"review",source_story_ids:rel.map((s:any)=>s.id),source_urls:[...new Set(rel.map((s:any)=>s.canonical_source_url))],provider:"BuildPulse AI / NVIDIA",model:out.model||null,generation_key:generationKey}).select("id,slug").single();
  if(write)throw write;const metrics={skipped:false,topic,articleId:article.id,slug:article.slug,sources:rel.length};
  if(run?.id)await db.from("buildpulse_job_runs").update({status:"ok",finished_at:new Date().toISOString(),metrics}).eq("id",run.id);
  return json({ok:true,...metrics});
 }catch(e){const message=e instanceof Error?e.message:String(e||"unknown");if(run?.id)await db.from("buildpulse_job_runs").update({status:"failed",finished_at:new Date().toISOString(),error:message.slice(0,2000)}).eq("id",run.id);return json({ok:false,error:message},500)}
});