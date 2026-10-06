import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2";
const locales=["ru","pl","sv","no","fi","da","ro","hu","cs","el","bg","uk","zh","ja","ko","ar","hi","tr","nl","pt","it","es","fr","de","en"];
const json=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json"}});
const clean=(s:string)=>s.trim().replace(/^\`\`\`(?:json)?/i,"").replace(/\`\`\`$/,"").trim();
Deno.serve(async(req)=>{
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
 const {data:setting}=await db.from("buildpulse_private_settings").select("value").eq("key","localization_scheduler_secret").maybeSingle();
 if(!setting?.value||req.headers.get("x-buildpulse-scheduler-secret")!==setting.value)return json({ok:false,error:"unauthorized"},401);
 const {data:run}=await db.from("buildpulse_job_runs").insert({job_name:"localize-supabase",status:"running",started_at:new Date().toISOString()}).select("id").single();
 let attempted=0,created=0,skipped=0,failed=0;
 try{
  const {data:stories,error}=await db.from("buildpulse_stories").select("id,title,summary,canonical_source_url,verified_at,verified_by,source_id,buildpulse_sources(name,source_language,country_code,region_name,city_name)").eq("verification_state","verified").not("verified_at","is",null).not("canonical_source_url","is",null).order("published_at",{ascending:false}).limit(30);if(error)throw error;
  outer: for(const story of stories||[]){const source:any=(story as any).buildpulse_sources;if(!source?.source_language)continue;for(const locale of locales){if(locale===String(source.source_language).toLowerCase().split("-")[0]){skipped++;continue}if(attempted>=25)break outer;
   const {data:ex}=await db.from("buildpulse_story_localizations").select("id").eq("story_id",story.id).eq("locale",locale).maybeSingle();if(ex){skipped++;continue}attempted++;
   try{const prompt=`Translate the following verified news title and summary faithfully into ${locale}. Preserve names, numbers, dates, uncertainty and attribution. Do not add facts. Return ONLY valid JSON with keys title and summary. SOURCE LANGUAGE: ${source.source_language}\nTITLE: ${story.title}\nSUMMARY: ${story.summary||""}\nSOURCE: ${story.canonical_source_url}`;
    const ai=await fetch("https://www.buildpulse.news/api/ai/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:prompt}]})});const out=await ai.json();if(!ai.ok||!out?.content)throw new Error(`ai_${ai.status}`);
    let parsed:any;try{parsed=JSON.parse(clean(String(out.content)))}catch{throw new Error("invalid_json")}if(typeof parsed?.title!=="string"||!parsed.title.trim()||typeof parsed?.summary!=="string")throw new Error("invalid_shape");
    const row={story_id:story.id,locale,title:parsed.title.trim().slice(0,500),summary:parsed.summary.trim().slice(0,5000),translation_state:"review",provider:"BuildPulse AI / NVIDIA",model:out.model||null,source_language:source.source_language,provenance:{canonical_source_url:story.canonical_source_url,verified_at:story.verified_at,verified_by:story.verified_by,generated_at:new Date().toISOString()}};
    const {error:w}=await db.from("buildpulse_story_localizations").insert(row);if(w)throw w;created++;
   }catch{failed++}
  }}
  const metrics={locales,attempted,created,skipped,failed};if(run?.id)await db.from("buildpulse_job_runs").update({status:failed&&created===0?"failed":"ok",finished_at:new Date().toISOString(),metrics,error:failed&&created===0?"all localization drafts failed":null}).eq("id",run.id);return json({ok:true,...metrics});
 }catch(e){const m=e instanceof Error?e.message:"unknown";if(run?.id)await db.from("buildpulse_job_runs").update({status:"failed",finished_at:new Date().toISOString(),error:m.slice(0,2000),metrics:{attempted,created,skipped,failed}}).eq("id",run.id);return json({ok:false,error:m},500)}
});