import Link from "next/link";
import {notFound} from "next/navigation";
import {createAdminClient} from "@/lib/supabase/admin";
import {LocalizedDate} from "@/components/buildpulse/LocalizedValue";

export const dynamic="force-dynamic";

export default async function StoryPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params; if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const db=createAdminClient();if(!db)notFound();
 const {data:s}=await db.from("buildpulse_stories").select("id,title,summary,category,published_at,verified_at,canonical_source_url,image_url,source_id,publication_state,correction_note").eq("id",id).eq("verification_state","verified").neq("publication_state","withheld").maybeSingle();
 if(!s)notFound();
 const [{data:source},{data:article}]=await Promise.all([
  db.from("buildpulse_sources").select("name,base_url").eq("id",s.source_id).maybeSingle(),
  db.from("buildpulse_story_articles").select("headline,dek,body_markdown,key_facts,why_it_matters,context,evidence,hero_image_url,hero_image_attribution,hero_image_rights_status,generation_state,published_at").eq("story_id",id).eq("generation_state","published").maybeSingle()
 ]);
 const hero=article?.hero_image_url&&article.hero_image_rights_status!=="blocked"&&article.hero_image_rights_status!=="unknown"?article.hero_image_url:null;
 const paragraphs=article?.body_markdown?String(article.body_markdown).split(/\n\n+/).filter(Boolean):[];
 const facts=Array.isArray(article?.key_facts)?article.key_facts:[];
 return <main className="mx-auto max-w-[1000px] px-5 py-12">
  <Link href="/archive" className="text-xs font-black text-[#0b6b63]">← BUILDPULSE NEWS</Link>
  <p className="mt-8 text-xs font-black uppercase tracking-[.16em] text-[#0b6b63]">{s.category||"Verified"} · VERIFIED REPORT</p>
  <h1 className="mt-4 text-5xl font-black leading-[1.02] tracking-[-.04em] md:text-7xl">{article?.headline||s.title}</h1>
  <p className="mt-6 max-w-3xl text-xl leading-8 text-[#53606b]">{article?.dek||s.summary}</p>
  <div className="mt-5 text-xs font-bold uppercase tracking-widest text-[#65717c]">{s.published_at?<LocalizedDate value={s.published_at}/>:null} · Source evidence: {source?.name||"Verified source"}</div>
  {hero?<figure className="mt-10"><img src={hero} alt="" className="max-h-[620px] w-full rounded-2xl object-cover" referrerPolicy="no-referrer"/>{article?.hero_image_attribution?<figcaption className="mt-2 text-xs text-[#65717c]">{article.hero_image_attribution}</figcaption>:null}</figure>:null}
  {article?<article className="mt-10">
   {facts.length?<section className="border-y border-black/15 py-7"><h2 className="text-xl font-black">Key facts</h2><ul className="mt-4 space-y-3">{facts.map((x:any,i:number)=><li key={i} className="text-base leading-7">• {typeof x==="string"?x:x?.text||JSON.stringify(x)}</li>)}</ul></section>:null}
   <div className="mt-9 space-y-6 text-lg leading-8">{paragraphs.map((p:string,i:number)=><p key={i}>{p}</p>)}</div>
   {article.why_it_matters?<section className="mt-10 rounded-2xl bg-[#eef4f1] p-7"><h2 className="text-2xl font-black">Why it matters</h2><p className="mt-4 text-lg leading-8">{article.why_it_matters}</p></section>:null}
   {article.context?<section className="mt-10"><h2 className="text-2xl font-black">Context</h2><p className="mt-4 text-lg leading-8">{article.context}</p></section>:null}
  </article>:<section className="mt-10 rounded-2xl border border-black/15 bg-[#fbfaf6] p-8"><h2 className="text-2xl font-black">BuildPulse full report is being prepared.</h2><p className="mt-3 leading-7 text-[#53606b]">This verified breaking item is already available on BuildPulse. Our reporting agents are preparing the detailed, source-grounded version; we do not fabricate missing detail while enrichment is pending.</p></section>}
  <section className="mt-12 border-t border-black/15 pt-7"><h2 className="text-lg font-black">Primary source</h2><p className="mt-2 text-sm leading-6 text-[#53606b]">BuildPulse preserves the original source for verification and further reading.</p><a href={s.canonical_source_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm font-black text-[#0b6b63]">{source?.name||"OPEN SOURCE"} ↗</a></section>
  {s.correction_note?<aside className="mt-8 border-l-4 border-black p-5"><strong>Correction:</strong> {s.correction_note}</aside>:null}
 </main>
}
