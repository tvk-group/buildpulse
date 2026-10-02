import {createClient} from "@/lib/supabase/server";

export async function GET(_request:Request,{params}:{params:Promise<{creativeId:string}>}){
  const {creativeId}=await params;
  if(!/^[0-9a-f-]{36}$/i.test(creativeId))return new Response("Not found",{status:404});
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return new Response("Unauthorized",{status:401});
  const {data:authorized}=await supabase.rpc("buildpulse_admin_is_authorized");
  if(!authorized)return new Response("Forbidden",{status:403});
  const {data:creative,error}=await supabase.from("buildpulse_ad_creatives")
    .select("storage_path,mime_type,sha256").eq("id",creativeId).maybeSingle();
  if(error||!creative)return new Response("Not found",{status:404});
  const {data:file,error:downloadError}=await supabase.storage.from("buildpulse-ad-creatives").download(creative.storage_path);
  if(downloadError||!file)return new Response("Not found",{status:404});
  return new Response(file.stream(),{headers:{
    "Content-Type":creative.mime_type,
    "Cache-Control":"private, no-store",
    "ETag":`"${creative.sha256}"`,
    "X-Content-Type-Options":"nosniff",
    "Content-Security-Policy":"default-src 'none'"
  }});
}
