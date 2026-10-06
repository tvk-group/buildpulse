import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
const H={"Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":"https://www.buildpulse.news","Access-Control-Allow-Headers":"content-type,apikey,authorization"};
function reply(b:unknown,s=200){return new Response(JSON.stringify(b),{status:s,headers:H})}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:H});
 if(req.method!=="POST")return reply({ok:false,error:"method_not_allowed"},405);
 const u=Deno.env.get("SUPABASE_URL")??"",k=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";if(!u||!k)return reply({ok:false,error:"unavailable"},503);
 const admin=createClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}});
 const b=await req.json().catch(()=>null),storyId=String(b?.story_id??"");if(!/^[0-9a-f-]{36}$/i.test(storyId))return reply({ok:false,error:"invalid_story"},400);
 const {data:s}=await admin.from("buildpulse_stories").select("id,canonical_source_url,verification_state,publication_state").eq("id",storyId).maybeSingle();
 if(!s?.canonical_source_url||s.verification_state!=="verified"||s.publication_state==="withheld")return reply({ok:false,error:"not_found"},404);
 let d:URL;try{d=new URL(s.canonical_source_url)}catch{return reply({ok:false,error:"invalid_destination"},400)}
 if(!["https:","http:"].includes(d.protocol))return reply({ok:false,error:"invalid_destination"},400);
 const host=d.hostname.toLowerCase().replace(/^www\./,"");
 const {data:p}=await admin.from("buildpulse_outbound_partners").select("id,commercial_model,status,tracking_template,tracking_domain,click_rate,currency,disclosure").eq("domain",host).eq("status","active").maybeSingle();
 let destination=d.toString(),commercial=false,revenue:number|null=null,currency:string|null=null;
 if(p&&p.commercial_model!=="none"){commercial=true;currency=p.currency;if(p.commercial_model==="cpc"&&p.click_rate!=null)revenue=Number(p.click_rate);if(p.tracking_template){const candidate=p.tracking_template.replaceAll("{url}",encodeURIComponent(d.toString())).replaceAll("{story_id}",s.id);try{const t=new URL(candidate),expected=String(p.tracking_domain||p.domain||"").toLowerCase();if(t.protocol==="https:"&&(!expected||t.hostname.toLowerCase()===expected))destination=t.toString()}catch{}}}
 await admin.from("buildpulse_outbound_clicks").insert({story_id:s.id,partner_id:p?.id??null,destination_host:host,destination_url:d.toString(),commercial,visitor_hash:null,ua_hash:null,referrer_path:null,eligible_revenue:revenue,currency,settlement_state:"unreported"});
 return reply({ok:true,destination,commercial,disclosure:commercial?(p?.disclosure||"Commercial partner link"):null});
});