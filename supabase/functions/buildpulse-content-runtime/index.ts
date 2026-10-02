import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
const BUCKET="buildpulse-editions";
const H={"Content-Type":"application/json","Cache-Control":"public, max-age=60, stale-while-revalidate=300"};
function reply(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:H})}
function safeLimit(v:string|null,max=100){const n=Number(v??20);return Number.isFinite(n)?Math.max(1,Math.min(max,Math.trunc(n))):20}
Deno.serve(async(req:Request)=>{
 try{
  if(req.method!=="GET")return reply({ok:false,error:"method_not_allowed"},405);
  const url=new URL(req.url),action=url.searchParams.get("action")??"";
  const supabaseUrl=Deno.env.get("SUPABASE_URL")??"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!supabaseUrl||!service)return reply({ok:false,error:"service_not_configured"},503);
  const admin=createClient(supabaseUrl,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const publicStates=["published","sending","sent"];

  if(action==="latest"||action==="list"){
    const limit=safeLimit(url.searchParams.get("limit"),action==="latest"?20:100);
    const type=(url.searchParams.get("type")??"").trim();
    const from=(url.searchParams.get("from")??"").trim(),to=(url.searchParams.get("to")??"").trim(),q=(url.searchParams.get("q")??"").trim().slice(0,80);
    let query=admin.from("buildpulse_editions").select("id,edition_type,subject,preheader,slug,published_at,pdf_path,public_excerpt,updated_at")
      .in("status",publicStates).eq("archive_visible",true).order("published_at",{ascending:false}).limit(limit);
    if(type)query=query.eq("edition_type",type);
    if(/^\d{4}-\d{2}-\d{2}$/.test(from))query=query.gte("published_at",from+"T00:00:00.000Z");
    if(/^\d{4}-\d{2}-\d{2}$/.test(to))query=query.lte("published_at",to+"T23:59:59.999Z");
    if(q){const clean=q.replace(/[%_,]/g," ");query=query.or(`subject.ilike.%${clean}%,public_excerpt.ilike.%${clean}%,preheader.ilike.%${clean}%`)}
    const {data,error}=await query;if(error)throw error;
    return reply({ok:true,editions:data??[]});
  }

  if(action==="get"){
    const slug=(url.searchParams.get("slug")??"").trim();
    if(!slug||slug.length>180)return reply({ok:false,error:"invalid_slug"},400);
    const {data,error}=await admin.from("buildpulse_editions")
      .select("id,subject,preheader,public_excerpt,body_html,published_at,edition_type,pdf_path,slug,correction_note,corrected_at,original_published_at,updated_at")
      .eq("slug",slug).in("status",publicStates).eq("archive_visible",true).maybeSingle();
    if(error)throw error;if(!data)return reply({ok:false,error:"not_found"},404);
    return reply({ok:true,edition:data});
  }

  if(action==="pdf"){
    const slug=(url.searchParams.get("slug")??"").trim();
    const {data:e,error}=await admin.from("buildpulse_editions").select("pdf_path,pdf_content_type,subject")
      .eq("slug",slug).in("status",publicStates).eq("archive_visible",true).not("pdf_path","is",null).maybeSingle();
    if(error)throw error;if(!e?.pdf_path)return reply({ok:false,error:"not_found"},404);
    const {data:file,error:downloadError}=await admin.storage.from(BUCKET).download(e.pdf_path);
    if(downloadError||!file)return reply({ok:false,error:"not_found"},404);
    return new Response(file.stream(),{headers:{
      "Content-Type":e.pdf_content_type||"application/pdf",
      "Content-Disposition":`attachment; filename="${slug.replace(/[^a-zA-Z0-9_-]/g,"-")}.pdf"`,
      "Cache-Control":"public, max-age=300, stale-while-revalidate=600",
      "X-Content-Type-Options":"nosniff"
    }});
  }
  return reply({ok:false,error:"unsupported_action"},400);
 }catch(error){console.error("buildpulse_content_runtime_error",error);return reply({ok:false,error:"runtime_error"},500)}
});