import {getSupabasePublicConfig} from "@/lib/supabase/env";

type PublicEdition={
  id:string;edition_type:string;subject:string;preheader:string|null;slug:string;published_at:string|null;
  pdf_path:string|null;public_excerpt:string|null;updated_at?:string|null;body_html?:string|null;
  correction_note?:string|null;corrected_at?:string|null;original_published_at?:string|null;
};

async function runtime(params:Record<string,string>){
  const {url,key,configured}=getSupabasePublicConfig();
  if(!configured)return null;
  const endpoint=new URL(`${url}/functions/v1/buildpulse-content-runtime`);
  for(const [k,v] of Object.entries(params))if(v)endpoint.searchParams.set(k,v);
  const response=await fetch(endpoint,{cache:"no-store",headers:{apikey:key}}).catch(()=>null);
  if(!response?.ok)return null;
  return response.json().catch(()=>null);
}

export async function listPublicEditions(options:{limit?:number;q?:string;type?:string;from?:string;to?:string}={}):Promise<PublicEdition[]>{
  const data=await runtime({action:"list",limit:String(options.limit??100),q:options.q??"",type:options.type??"",from:options.from??"",to:options.to??""});
  return Array.isArray(data?.editions)?data.editions:[];
}
export async function latestPublicEditions(limit=7):Promise<PublicEdition[]>{
  const data=await runtime({action:"latest",limit:String(limit)});
  return Array.isArray(data?.editions)?data.editions:[];
}
export async function getPublicEdition(slug:string):Promise<PublicEdition|null>{
  const data=await runtime({action:"get",slug});
  return data?.edition??null;
}
export function publicEditionPdfRuntimeUrl(slug:string){
  const {url,configured}=getSupabasePublicConfig();
  if(!configured)return "#";
  const endpoint=new URL(`${url}/functions/v1/buildpulse-content-runtime`);
  endpoint.searchParams.set("action","pdf");endpoint.searchParams.set("slug",slug);
  return endpoint.toString();
}
