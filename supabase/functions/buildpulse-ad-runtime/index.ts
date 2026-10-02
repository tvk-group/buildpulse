import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";

const BUCKET="buildpulse-ad-creatives";
const jsonHeaders={"Content-Type":"application/json","Cache-Control":"no-store"};

function reply(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:jsonHeaders})}
function humanLike(ua:string){return ua.length>=12&&!/(bot|crawler|spider|slurp|headless|preview|scanner|curl|wget)/i.test(ua)}
function privateIp(ip:string){
  return /^127\.|^10\.|^192\.168\.|^169\.254\.|^0\.|^224\.|^240\.|^255\./.test(ip)
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
    || ip==="::1"||/^fc/i.test(ip)||/^fd/i.test(ip)||/^fe8/i.test(ip)||/^fe9/i.test(ip)||/^fea/i.test(ip)||/^feb/i.test(ip);
}
async function safeDestination(raw:string){
  let url:URL;
  try{url=new URL(raw)}catch{throw new Error("unsafe_destination")}
  if(url.protocol!=="https:"||url.username||url.password)throw new Error("unsafe_destination");
  const host=url.hostname.toLowerCase();
  if(host==="localhost"||host.endsWith(".localhost")||privateIp(host))throw new Error("unsafe_destination");
  try{
    const [a,aaaa]=await Promise.allSettled([Deno.resolveDns(host,"A"),Deno.resolveDns(host,"AAAA")]);
    const ips=[
      ...(a.status==="fulfilled"?a.value:[]),
      ...(aaaa.status==="fulfilled"?aaaa.value:[])
    ];
    if(!ips.length||ips.some(privateIp))throw new Error("unsafe_destination");
  }catch{throw new Error("unsafe_destination")}
  return url.toString();
}
async function hashText(value:string){
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function getActiveOrder(admin:any,orderId:string){
  const now=new Date().toISOString();
  const {data,error}=await admin.from("buildpulse_ad_orders")
    .select("id,destination_url,status,starts_at,ends_at")
    .eq("id",orderId).eq("status","active")
    .lte("starts_at",now).gte("ends_at",now).maybeSingle();
  if(error)throw error;
  return data;
}
async function recordEvent(admin:any,req:Request,orderId:string,type:"click"|"impression"){
  const ua=req.headers.get("x-buildpulse-user-agent")??req.headers.get("user-agent")??"";
  const forwarded=req.headers.get("x-buildpulse-forwarded-for")??"";
  const verified=humanLike(ua);
  const hour=Math.floor(Date.now()/3600000);
  const fingerprint=await hashText(`${orderId}|${type}|${hour}|${ua}|${forwarded}`);
  const eventKey=`runtime:${type}:${fingerprint}`;
  const {error}=await admin.from("buildpulse_ad_events").insert({
    order_id:orderId,event_type:type,event_key:eventKey,is_verified:verified,
    rejection_reason:verified?null:"automated_or_missing_user_agent",
    metadata:{source:"buildpulse_supabase_ad_runtime",verification:"basic_user_agent_filter",hour_bucket:hour}
  });
  if(error&&error.code!=="23505")throw error;
}

Deno.serve(async(req:Request)=>{
  try{
    const url=new URL(req.url);
    const action=url.searchParams.get("action")??"";
    const orderId=url.searchParams.get("order")??"";

    const supabaseUrl=Deno.env.get("SUPABASE_URL")??"";
    const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
    if(!supabaseUrl||!service)return reply({ok:false,error:"service_not_configured"},503);
    const admin=createClient(supabaseUrl,service,{auth:{persistSession:false,autoRefreshToken:false}});

    if(action==="lookup"){
      const placement=String(url.searchParams.get("placement")??"");
      if(!["homepage","archive","edition_top","edition_inline","edition_footer","newsletter"].includes(placement))return reply({ok:false,error:"invalid_placement"},400);
      const now=new Date().toISOString();
      const {data:products,error:productError}=await admin.from("buildpulse_ad_products").select("id,width_px,height_px").eq("placement",placement).eq("active",true);
      if(productError)throw productError;
      if(!products?.length)return reply({ok:true,ad:null});
      const {data:ad,error:adError}=await admin.from("buildpulse_ad_orders")
        .select("id,headline,copy_text,product_id,starts_at,ends_at")
        .eq("status","active").in("product_id",products.map((p:any)=>p.id))
        .lte("starts_at",now).gte("ends_at",now).order("created_at",{ascending:true}).limit(1).maybeSingle();
      if(adError)throw adError;
      if(!ad)return reply({ok:true,ad:null});
      const product=products.find((p:any)=>p.id===ad.product_id);
      const {data:creative}=await admin.from("buildpulse_ad_creatives").select("id").eq("order_id",ad.id).eq("review_state","approved").limit(1).maybeSingle();
      return reply({ok:true,ad:{
        orderId:ad.id,headline:ad.headline,copyText:ad.copy_text,productId:ad.product_id,
        widthPx:product?.width_px??null,heightPx:product?.height_px??null,hasCreative:Boolean(creative)
      }});
    }

    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId))return reply({ok:false,error:"invalid_order"},400);
    const order=await getActiveOrder(admin,orderId);
    if(!order)return reply({ok:false,error:"active_ad_not_found"},404);

    if(action==="click"){
      const destination=await safeDestination(order.destination_url);
      await recordEvent(admin,req,orderId,"click");
      return reply({ok:true,destination});
    }

    if(action==="impression"){
      await recordEvent(admin,req,orderId,"impression");
      return new Response(null,{status:204,headers:{"Cache-Control":"no-store"}});
    }

    if(action==="creative"){
      const {data:creative,error}=await admin.from("buildpulse_ad_creatives")
        .select("storage_path,mime_type,sha256")
        .eq("order_id",orderId).eq("review_state","approved")
        .order("created_at",{ascending:false}).limit(1).maybeSingle();
      if(error)throw error;
      if(!creative)return reply({ok:false,error:"approved_creative_not_found"},404);
      const {data:file,error:downloadError}=await admin.storage.from(BUCKET).download(creative.storage_path);
      if(downloadError||!file)return reply({ok:false,error:"creative_unavailable"},404);
      return new Response(file.stream(),{
        status:200,
        headers:{
          "Content-Type":creative.mime_type,
          "Cache-Control":"public, max-age=300, stale-while-revalidate=600",
          "X-Content-Type-Options":"nosniff",
          "Content-Security-Policy":"default-src 'none'",
          "ETag":`"${creative.sha256}"`
        }
      });
    }

    return reply({ok:false,error:"unsupported_action"},400);
  }catch(error){
    console.error("buildpulse_ad_runtime_error",error);
    return reply({ok:false,error:error instanceof Error?error.message:"runtime_error"},500);
  }
});
