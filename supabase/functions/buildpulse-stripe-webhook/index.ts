import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";

const ISSUER={
  name:"TVK LABS & TECHNOLOGIES LTD",
  companyNumber:"16481808",
  registeredOffice:"Office 23, Unit 5, 399-405 Oxford Street, London, United Kingdom, W1C 2BU"
};
const headers={"Content-Type":"application/json"};
function reply(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers})}
function invoiceNumber(orderId:string,createdAt:string){return `BP-${new Date(createdAt).getUTCFullYear()}-${orderId.replaceAll("-","").slice(0,12).toUpperCase()}`}
function cents(value:unknown){const n=Number(value);return Number.isFinite(n)?Math.round(n*100):NaN}
function hex(bytes:ArrayBuffer){return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,"0")).join("")}
function constantEqual(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
async function verifyStripeSignature(raw:string,header:string,secret:string){
  const parts=header.split(",").map(x=>x.trim());
  const timestamp=parts.find(x=>x.startsWith("t="))?.slice(2);
  const signatures=parts.filter(x=>x.startsWith("v1=")).map(x=>x.slice(3));
  if(!timestamp||!signatures.length)return false;
  const seconds=Number(timestamp);
  if(!Number.isFinite(seconds)||Math.abs(Date.now()/1000-seconds)>300)return false;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signature=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(`${timestamp}.${raw}`));
  const expected=hex(signature);
  return signatures.some(sig=>constantEqual(sig.toLowerCase(),expected));
}
async function ensureInvoice(admin:any,order:any,profile:any,method:string,reference:string){
  const now=new Date().toISOString();
  const {data,error}=await admin.from("buildpulse_billing_invoices").upsert({
    order_id:order.id,user_id:order.user_id,invoice_number:invoiceNumber(order.id,order.created_at),
    issuer_name:ISSUER.name,issuer_company_number:ISSUER.companyNumber,issuer_registered_office:ISSUER.registeredOffice,
    billing_company:profile?.company_name??null,billing_email:profile?.billing_email??null,amount_usd:order.amount_usd,
    currency:"USD",payment_method:method,payment_reference:reference,status:"open",updated_at:now
  },{onConflict:"order_id"}).select("id,invoice_number,status").single();
  if(error||!data)throw new Error("invoice_persistence_failed");
  return data;
}
async function appendPaymentEvent(admin:any,event:any,orderId:string,state:"confirmed"|"rejected",paymentIntent:string|null,amount:number,metadata:any){
  const {error}=await admin.from("buildpulse_ad_payment_events").insert({
    order_id:orderId,provider_event_key:`stripe:${event.id}`,crypto_asset:"USD",crypto_network:"stripe",
    tx_hash:paymentIntent,observed_amount:amount,confirmations:1,state,metadata:{provider:"stripe",...metadata}
  });
  if(error&&error.code!=="23505")throw error;
}
async function settleCheckout(admin:any,event:any,session:any){
  const orderId=String(session.client_reference_id||session?.metadata?.buildpulse_order_id||"");
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId))return {ignored:"missing_order_reference"};
  if(session.payment_status!=="paid")return {ignored:"checkout_not_paid",payment_status:session.payment_status??null};

  const {data:seen}=await admin.from("buildpulse_ad_payment_events").select("id").eq("provider_event_key",`stripe:${event.id}`).maybeSingle();
  if(seen)return {idempotent:true};

  const {data:order,error:orderError}=await admin.from("buildpulse_ad_orders")
    .select("id,user_id,product_id,status,amount_usd,created_at").eq("id",orderId).maybeSingle();
  if(orderError||!order)return {ignored:"order_not_found"};
  const [{data:product},{data:profile}]=await Promise.all([
    admin.from("buildpulse_ad_products").select("stripe_payment_link_id,price_usd").eq("id",order.product_id).maybeSingle(),
    admin.from("buildpulse_advertiser_profiles").select("company_name,billing_email").eq("user_id",order.user_id).maybeSingle()
  ]);
  const sessionLink=typeof session.payment_link==="string"?session.payment_link:session.payment_link?.id;
  const paymentIntent=typeof session.payment_intent==="string"?session.payment_intent:session.payment_intent?.id??null;
  const amountUsd=Number(session.amount_total??0)/100;
  const validLink=Boolean(product?.stripe_payment_link_id)&&sessionLink===product.stripe_payment_link_id;
  const validAmount=Number.isInteger(session.amount_total)&&session.amount_total===cents(order.amount_usd)&&session.amount_total===cents(product?.price_usd);
  const validCurrency=String(session.currency??"").toLowerCase()==="usd";
  if(!validLink||!validAmount||!validCurrency){
    await appendPaymentEvent(admin,event,order.id,"rejected",paymentIntent,amountUsd,{
      checkout_session_id:session.id,payment_link:sessionLink,valid_link:validLink,valid_amount:validAmount,valid_currency:validCurrency
    });
    return {rejected:"checkout_reconciliation_failed"};
  }

  await ensureInvoice(admin,order,profile,"stripe",session.id);
  const now=new Date().toISOString();
  await appendPaymentEvent(admin,event,order.id,"confirmed",paymentIntent,amountUsd,{
    checkout_session_id:session.id,payment_link:sessionLink,customer_email:session.customer_details?.email??session.customer_email??null
  });
  await Promise.all([
    admin.from("buildpulse_ad_orders").update({
      status:"review",paid_tx_hash:paymentIntent,paid_at:now,payment_method:"stripe",payment_provider:"stripe",payment_reference:session.id,updated_at:now
    }).eq("id",order.id).in("status",["draft","awaiting_payment","payment_detected","review"]),
    admin.from("buildpulse_billing_invoices").update({
      status:"paid",paid_at:now,payment_method:"stripe",payment_reference:session.id,updated_at:now,
      metadata:{stripe_checkout_session_id:session.id,stripe_payment_intent:paymentIntent,stripe_payment_link:sessionLink}
    }).eq("order_id",order.id)
  ]);
  return {settled:true,orderId};
}
async function paymentOrderByIntent(admin:any,paymentIntent:string){
  const {data:event}=await admin.from("buildpulse_ad_payment_events").select("order_id")
    .eq("crypto_network","stripe").eq("tx_hash",paymentIntent).eq("state","confirmed")
    .order("observed_at",{ascending:false}).limit(1).maybeSingle();
  return event?.order_id??null;
}
async function handleRefund(admin:any,event:any,charge:any){
  const paymentIntent=typeof charge.payment_intent==="string"?charge.payment_intent:charge.payment_intent?.id;
  if(!paymentIntent)return {ignored:"refund_without_payment_intent"};
  const orderId=await paymentOrderByIntent(admin,paymentIntent);
  if(!orderId)return {ignored:"payment_intent_not_mapped"};
  const full=Number(charge.amount_refunded??0)>=Number(charge.amount??0)&&Number(charge.amount??0)>0;
  const refundedUsd=Number(charge.amount_refunded??0)/100;
  await appendPaymentEvent(admin,event,orderId,"rejected",paymentIntent,refundedUsd,{
    kind:full?"full_refund":"partial_refund",charge_id:charge.id,amount_refunded:charge.amount_refunded,amount:charge.amount
  });
  const now=new Date().toISOString();
  await Promise.all([
    admin.from("buildpulse_billing_invoices").update({
      status:full?"refunded":"partially_refunded",updated_at:now,
      metadata:{stripe_charge_id:charge.id,stripe_payment_intent:paymentIntent,amount_refunded:charge.amount_refunded,refund_state:full?"full":"partial"}
    }).eq("order_id",orderId),
    full
      ?admin.from("buildpulse_ad_orders").update({status:"cancelled",updated_at:now}).eq("id",orderId).in("status",["review","approved","scheduled","active"])
      :admin.from("buildpulse_ad_orders").update({status:"review",updated_at:now}).eq("id",orderId).in("status",["approved","scheduled","active"])
  ]);
  return {refund:true,full,orderId};
}
async function handleDispute(admin:any,event:any,dispute:any){
  const paymentIntent=typeof dispute.payment_intent==="string"?dispute.payment_intent:dispute.payment_intent?.id;
  if(!paymentIntent)return {ignored:"dispute_without_payment_intent"};
  const orderId=await paymentOrderByIntent(admin,paymentIntent);
  if(!orderId)return {ignored:"payment_intent_not_mapped"};
  const now=new Date().toISOString();
  if(event.type==="charge.dispute.created"){
    await appendPaymentEvent(admin,event,orderId,"rejected",paymentIntent,Number(dispute.amount??0)/100,{kind:"dispute_created",dispute_id:dispute.id,status:dispute.status});
    await Promise.all([
      admin.from("buildpulse_billing_invoices").update({status:"disputed",updated_at:now,metadata:{stripe_dispute_id:dispute.id,stripe_payment_intent:paymentIntent,dispute_status:dispute.status}}).eq("order_id",orderId),
      admin.from("buildpulse_ad_orders").update({status:"review",updated_at:now}).eq("id",orderId).in("status",["approved","scheduled","active"])
    ]);
    return {disputed:true,orderId};
  }
  if(event.type==="charge.dispute.closed"){
    const won=String(dispute.status)==="won"||String(dispute.status)==="warning_closed";
    await appendPaymentEvent(admin,event,orderId,won?"confirmed":"rejected",paymentIntent,Number(dispute.amount??0)/100,{kind:"dispute_closed",dispute_id:dispute.id,status:dispute.status});
    await Promise.all([
      admin.from("buildpulse_billing_invoices").update({status:won?"paid":"refunded",updated_at:now,metadata:{stripe_dispute_id:dispute.id,stripe_payment_intent:paymentIntent,dispute_status:dispute.status}}).eq("order_id",orderId),
      won
        ?admin.from("buildpulse_ad_orders").update({status:"review",updated_at:now}).eq("id",orderId).in("status",["approved","scheduled","active"])
        :admin.from("buildpulse_ad_orders").update({status:"cancelled",updated_at:now}).eq("id",orderId).in("status",["review","approved","scheduled","active"])
    ]);
    return {disputeClosed:true,won,orderId};
  }
  return {ignored:"unsupported_dispute_event"};
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return reply({ok:false,error:"method_not_allowed"},405);
  try{
    const url=Deno.env.get("SUPABASE_URL")??"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
    if(!url||!service)return reply({ok:false,error:"service_not_configured"},503);
    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:setting,error:settingError}=await admin.from("buildpulse_private_settings").select("value").eq("key","stripe_webhook_secret").maybeSingle();
    if(settingError||!setting?.value)return reply({ok:false,error:"webhook_secret_unavailable"},503);
    const raw=await req.text(),signature=req.headers.get("stripe-signature")??"";
    if(!await verifyStripeSignature(raw,signature,setting.value))return reply({ok:false,error:"invalid_signature"},401);
    let event:any;
    try{event=JSON.parse(raw)}catch{return reply({ok:false,error:"invalid_json"},400)}
    const type=String(event?.type??""),object=event?.data?.object??{};
    let result:any={ignored:"unsupported_event"};
    if(type==="checkout.session.completed"||type==="checkout.session.async_payment_succeeded")result=await settleCheckout(admin,event,object);
    else if(type==="checkout.session.async_payment_failed"||type==="checkout.session.expired")result={ignored:type};
    else if(type==="charge.refunded")result=await handleRefund(admin,event,object);
    else if(type==="charge.dispute.created"||type==="charge.dispute.closed")result=await handleDispute(admin,event,object);
    return reply({ok:true,...result});
  }catch(error){
    console.error("buildpulse_stripe_webhook_error",error);
    return reply({ok:false,error:"webhook_processing_failed"},500);
  }
});
