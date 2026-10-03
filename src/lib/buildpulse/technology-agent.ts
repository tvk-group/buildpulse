import {createHash} from "crypto";
import {createAdminClient} from "@/lib/supabase/admin";
import {runBuildPulseAi} from "@/lib/buildpulse/ai-gateway";

const topics=["tvk-ecosystem","entelekron","sovereign-ai","energiemind","presale-technology"] as const;
const labels:Record<(typeof topics)[number],string>={
 "tvk-ecosystem":"TVK ecosystem technology",
 entelekron:"ENTELΞKRON ecosystem",
 "sovereign-ai":"Sovereign AI",
 energiemind:"EnergieMIND",
 "presale-technology":"presale infrastructure and technology"
};
function slugify(v:string){return v.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,88)}
function parse(text:string){const title=text.match(/^TITLE:\s*(.+)$/mi)?.[1]?.trim();const dek=text.match(/^DEK:\s*(.+)$/mi)?.[1]?.trim();const body=text.split(/^BODY:\s*$/mi)[1]?.trim();if(!title||!body)throw new Error("Technology agent returned invalid article format");return{title,dek:dek||null,body}}
export async function runTechnologyEditorialAgent(){
 const db=createAdminClient();if(!db)throw new Error("Supabase admin unavailable");
 const {data:agent,error:ae}=await db.from("buildpulse_agents").select("id,enabled").eq("code","technology-editorial").maybeSingle();
 if(ae||!agent?.enabled)throw new Error("Technology editorial agent unavailable");
 const {data:last}=await db.from("buildpulse_technology_articles").select("topic").order("generated_at",{ascending:false}).limit(1).maybeSingle();
 const idx=last?Math.max(0,topics.indexOf(last.topic as any)): -1,topic=topics[(idx+1)%topics.length];
 const since=new Date(Date.now()-14*86400000).toISOString();
 const {data:stories,error}=await db.from("buildpulse_stories").select("id,title,summary,category,canonical_source_url,published_at,verified_at,verified_by").eq("verification_state","verified").not("canonical_source_url","is",null).not("verified_at","is",null).not("verified_by","is",null).gte("published_at",since).order("editorial_score",{ascending:false}).limit(12);
 if(error)throw error;if(!(stories??[]).length)return{skipped:true,reason:"no_recent_verified_sources",topic};
 const sourceText=stories!.map((s:any,i:number)=>`[${i+1}] ${s.title}\nSummary: ${s.summary??""}\nSource: ${s.canonical_source_url}`).join("\n\n");
 const key=createHash("sha256").update(topic+"|"+stories!.map((s:any)=>s.id).join("|")+"|"+new Date().toISOString().slice(0,10)).digest("hex");
 const {data:existing}=await db.from("buildpulse_technology_articles").select("id").eq("generation_key",key).maybeSingle();if(existing)return{skipped:true,reason:"already_generated",topic};
 const system=`You are BuildPulse Technology Editorial Agent. Write rigorous technology journalism only from supplied verified source material. Focus: ${labels[topic]}. Never invent audits, partnerships, listings, prices, performance, regulatory status, security guarantees or roadmap completion. Do not turn the article into investment solicitation. Distinguish architecture/design goals from deployed facts. Output exactly TITLE:, DEK:, BODY:. BODY is Markdown, 700-1200 words, with descriptive subheadings and a final "Sources" section containing only supplied source URLs.`;
 const out=await runBuildPulseAi({task:"news_draft",system,input:sourceText,maxOutputTokens:2200,temperature:0.15});
 const parsed=parse(out.text),slug=`${slugify(parsed.title)}-${new Date().toISOString().slice(0,10)}`;
 const {data:article,error:write}=await db.from("buildpulse_technology_articles").insert({slug,topic,title:parsed.title,dek:parsed.dek,body_markdown:parsed.body,status:"review",source_story_ids:stories!.map((s:any)=>s.id),source_urls:stories!.map((s:any)=>s.canonical_source_url),provider:out.provider,model:out.model,generation_key:key}).select("id,slug").single();
 if(write)throw write;return{skipped:false,topic,articleId:article.id,slug:article.slug,provider:out.provider,model:out.model,sources:stories!.length}
}
