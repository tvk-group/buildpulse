import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";

const JSON_HEADERS={"Content-Type":"application/json","Cache-Control":"no-store"};
const BUCKET="buildpulse-ad-creatives";
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:JSON_HEADERS})}

async function context(req:Request){
  const url=Deno.env.get("SUPABASE_URL")??"";
  const anon=Deno.env.get("SUPABASE_ANON_KEY")??"";
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  const authorization=req.headers.get("Authorization")??"";
  if(!url||!anon||!service)throw new Error("service_not_configured");
  if(!authorization.startsWith("Bearer "))throw new Error("authentication_required");
  const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await userClient.auth.getUser();
  if(error||!user)throw new Error("authentication_required");
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:role,error:roleError}=await admin.from("role_assignments")
    .select("id").eq("user_id",user.id).eq("role","admin").is("revoked_at",null).limit(1).maybeSingle();
  if(roleError||!role)throw new Error("admin_required");
  return {user,admin};
}

async function queue(admin:any){
  const {data:orders,error}=await admin.from("buildpulse_ad_orders")
    .select("id,user_id,product_id,status,headline,copy_text,destination_url,amount_usd,created_at,starts_at,ends_at,review_notes")
    .in("status",["payment_detected","review","approved","scheduled","active"])
    .order("created_at",{ascending:false}).limit(250);
  if(error)throw error;
  if(!(orders??[]).length)return [];
  const productIds=[...new Set((orders??[]).map((o:any)=>o.product_id))];
  const userIds=[...new Set((orders??[]).map((o:any)=>o.user_id))];
  const orderIds=(orders??[]).map((o:any)=>o.id);
  const [{data:products},{data:profiles},{data:payments},{data:creatives}]=await Promise.all([
    admin.from("buildpulse_ad_products").select("id,code,name,placement,width_px,height_px,duration_days").in("id",productIds),
    admin.from("buildpulse_advertiser_profiles").select("user_id,company_name,billing_email,website_url").in("user_id",userIds),
    admin.from("buildpulse_ad_payment_events").select("order_id,state,observed_at").in("order_id",orderIds).order("observed_at",{ascending:false}),
    admin.from("buildpulse_ad_creatives").select("id,order_id,mime_type,byte_size,width_px,height_px,sha256,review_state,review_notes,created_at").in("order_id",orderIds).order("created_at",{ascending:false})
  ]);
  const productMap=new Map((products??[]).map((x:any)=>[x.id,x]));
  const profileMap=new Map((profiles??[]).map((x:any)=>[x.user_id,x]));
  const paymentMap=new Map<string,string>();
  for(const x of payments??[])if(!paymentMap.has(x.order_id))paymentMap.set(x.order_id,x.state);
  const creativeMap=new Map<string,any[]>();
  for(const x of creatives??[]){
    const list=creativeMap.get(x.order_id)??[];
    list.push({id:x.id,mimeType:x.mime_type,byteSize:x.byte_size,widthPx:x.width_px,heightPx:x.height_px,sha256:x.sha256,reviewState:x.review_state,reviewNotes:x.review_notes,createdAt:x.created_at});
    creativeMap.set(x.order_id,list);
  }
  return (orders??[]).map((o:any)=>{
    const p:any=productMap.get(o.product_id)??{},a:any=profileMap.get(o.user_id)??{};
    return {
      id:o.id,status:o.status,headline:o.headline,copyText:o.copy_text,destinationUrl:o.destination_url,
      amountUsd:o.amount_usd,createdAt:o.created_at,startsAt:o.starts_at,endsAt:o.ends_at,reviewNotes:o.review_notes,
      paymentState:paymentMap.get(o.id)??null,
      product:{code:p.code??"",name:p.name??"",placement:p.placement??"",widthPx:p.width_px??null,heightPx:p.height_px??null,durationDays:p.duration_days??0},
      advertiser:{companyName:a.company_name??null,billingEmail:a.billing_email??null,websiteUrl:a.website_url??null},
      creatives:creativeMap.get(o.id)??[]
    };
  });
}

async function reviewCreative(admin:any,user:any,body:any){
  const creativeId=String(body.creativeId??"");
  const decision=String(body.decision??"");
  const notes=typeof body.notes==="string"?body.notes.trim().slice(0,2000):null;
  if(!/^[0-9a-f-]{36}$/i.test(creativeId)||!["approved","rejected"].includes(decision))throw new Error("invalid_request");
  const {data:c,error}=await admin.from("buildpulse_ad_creatives").select("id,order_id,width_px,height_px").eq("id",creativeId).maybeSingle();
  if(error||!c)throw new Error("creative_not_found");
  const {data:o}=await admin.from("buildpulse_ad_orders").select("product_id").eq("id",c.order_id).maybeSingle();
  const {data:p}=o?await admin.from("buildpulse_ad_products").select("width_px,height_px").eq("id",o.product_id).maybeSingle():{data:null};
  if(decision==="approved"&&p?.width_px!=null&&p?.height_px!=null&&(c.width_px!==p.width_px||c.height_px!==p.height_px))throw new Error("creative_dimensions_mismatch");
  const now=new Date().toISOString();
  const {error:updateError}=await admin.from("buildpulse_ad_creatives").update({
    review_state:decision,review_notes:notes||null,reviewed_at:now,reviewed_by:user.email??user.id
  }).eq("id",creativeId);
  if(updateError)throw updateError;
  return {ok:true,creativeId,state:decision,reviewedBy:user.email??user.id};
}

async function orderAction(admin:any,user:any,body:any){
  const orderId=String(body.orderId??""),action=String(body.actionType??body.orderAction??body.order_action??body.decision??body.command??body.orderCommand??body.actionName??body.orderActionName??body.order_op??body.orderOp??body.actionValue??body.operation??"");
  const desired=action||String(body.value??"");
  const startsAt=body.startsAt?new Date(String(body.startsAt)):null;
  const notes=typeof body.notes==="string"?body.notes.trim().slice(0,2000):null;
  if(!/^[0-9a-f-]{36}$/i.test(orderId)||!["approve","reject","schedule"].includes(desired))throw new Error("invalid_request");
  const {data:o,error}=await admin.from("buildpulse_ad_orders").select("id,product_id,status").eq("id",orderId).maybeSingle();
  if(error||!o)throw new Error("order_not_found");
  if(desired==="reject"){
    const {data:updated,error:u}=await admin.from("buildpulse_ad_orders").update({status:"rejected",review_notes:notes||null,updated_at:new Date().toISOString()})
      .eq("id",orderId).in("status",["payment_detected","review","approved","scheduled"]).select("id").maybeSingle();
    if(u||!updated)throw new Error("order_not_rejectable");
    return {ok:true,state:"rejected",reviewedBy:user.email??user.id};
  }
  const [{data:payments},{data:creatives},{data:p}]=await Promise.all([
    admin.from("buildpulse_ad_payment_events").select("state,observed_at").eq("order_id",orderId).order("observed_at",{ascending:false}).limit(1),
    admin.from("buildpulse_ad_creatives").select("id,review_state").eq("order_id",orderId),
    admin.from("buildpulse_ad_products").select("duration_days,width_px,height_px").eq("id",o.product_id).maybeSingle()
  ]);
  if(!payments?.[0]||payments[0].state!=="confirmed")throw new Error("confirmed_payment_required");
  if((creatives??[]).some((c:any)=>c.review_state!=="approved"))throw new Error("creative_review_incomplete");
  if(p?.width_px!=null&&p?.height_px!=null&&!(creatives??[]).some((c:any)=>c.review_state==="approved"))throw new Error("approved_creative_required");
  if(desired==="approve"){
    const {data:updated,error:u}=await admin.from("buildpulse_ad_orders").update({status:"approved",review_notes:notes||null,updated_at:new Date().toISOString()})
      .eq("id",orderId).in("status",["payment_detected","review"]).select("id").maybeSingle();
    if(u||!updated)throw new Error("order_not_approvable");
    return {ok:true,state:"approved",reviewedBy:user.email??user.id};
  }
  if(o.status!=="approved"||!startsAt||Number.isNaN(startsAt.getTime())||startsAt.getTime()<Date.now()-60_000)throw new Error("approved_order_and_valid_start_required");
  if(!p)throw new Error("product_not_found");
  const endsAt=new Date(startsAt.getTime()+Number(p.duration_days)*86_400_000);
  const {data:conflicts,error:conflictError}=await admin.from("buildpulse_ad_orders").select("id")
    .eq("product_id",o.product_id).neq("id",orderId).in("status",["scheduled","active"])
    .lt("starts_at",endsAt.toISOString()).gt("ends_at",startsAt.toISOString()).limit(1);
  if(conflictError)throw conflictError;
  if((conflicts??[]).length)throw new Error("inventory_conflict");
  const {data:updated,error:u}=await admin.from("buildpulse_ad_orders").update({
    status:"scheduled",starts_at:startsAt.toISOString(),ends_at:endsAt.toISOString(),review_notes:notes||null,updated_at:new Date().toISOString()
  }).eq("id",orderId).eq("status","approved").select("id").maybeSingle();
  if(u||!updated)throw new Error("order_no_longer_schedulable");
  return {ok:true,state:"scheduled",startsAt:startsAt.toISOString(),endsAt:endsAt.toISOString(),scheduledBy:user.email??user.id};
}

async function creative(admin:any,creativeId:string){
  if(!/^[0-9a-f-]{36}$/i.test(creativeId))throw new Error("invalid_request");
  const {data:c,error}=await admin.from("buildpulse_ad_creatives").select("storage_path,mime_type,sha256").eq("id",creativeId).maybeSingle();
  if(error||!c)throw new Error("creative_not_found");
  const {data:file,error:d}=await admin.storage.from(BUCKET).download(c.storage_path);
  if(d||!file)throw new Error("creative_unavailable");
  return new Response(file.stream(),{status:200,headers:{
    "Content-Type":c.mime_type,"Cache-Control":"private, no-store","ETag":`"${c.sha256}"`,
    "X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'"
  }});
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type"}});
  try{
    const {user,admin}=await context(req);
    const url=new URL(req.url);
    if(req.method==="GET"&&url.searchParams.get("action")==="creative")return await creative(admin,String(url.searchParams.get("creativeId")??""));
    if(req.method!=="POST")return json({ok:false,error:"method_not_allowed"},405);
    const body=await req.json().catch(()=>null);
    if(!body||typeof body!=="object")return json({ok:false,error:"invalid_request"},400);
    const action=String(body.action??"");
    if(action==="queue")return json({ok:true,queue:await queue(admin)});
    if(action==="reviewCreative")return json(await reviewCreative(admin,user,body));
    if(action==="order")return json(await orderAction(admin,user,body));
    return json({ok:false,error:"unsupported_action"},400);
  }catch(error){
    const message=error instanceof Error?error.message:"admin_operation_failed";
    const status=message==="authentication_required"?401:message==="admin_required"?403:
      ["invalid_request","creative_dimensions_mismatch","approved_order_and_valid_start_required"].includes(message)?400:
      ["creative_not_found","order_not_found","product_not_found"].includes(message)?404:
      ["confirmed_payment_required","creative_review_incomplete","approved_creative_required","order_not_rejectable","order_not_approvable","inventory_conflict","order_no_longer_schedulable"].includes(message)?409:500;
    return json({ok:false,error:message},status);
  }
});
