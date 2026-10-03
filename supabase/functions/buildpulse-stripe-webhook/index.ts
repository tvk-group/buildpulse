import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";

const ISSUER={
  name:"TVK LABS & TECHNOLOGIES LTD",
  companyNumber:"16481808",
  registeredOffice:"Office 23, Unit 5, 399-405 Oxford Street, London, United Kingdom, W1C 2BU"
};
const headers={"Content-Type":"application/json"};
function reply(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers})}
async function invoiceNumber(admin:any,orderId:string,issuedAt:string){
  const {data:existing,error:existingError}=await admin.from("buildpulse_billing_invoices").select("invoice_number").eq("order_id",orderId).maybeSingle();
  if(existingError)throw new Error("invoice_lookup_failed");
  if(existing?.invoice_number)return existing.invoice_number;
  const {data:entity,error:entityError}=await admin.from("buildpulse_accounting_entities").select("id").eq("is_default",true).maybeSingle();
  if(entityError||!entity)throw new Error("accounting_entity_missing");
  const {data:number,error:numberError}=await admin.rpc("buildpulse_next_document_number",{p_entity_id:entity.id,p_document_type:"invoice",p_issued_at:issuedAt});
  if(numberError||!number)throw new Error("invoice_number_allocation_failed");
  return String(number);
}
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
    order_id:order.id,user_id:order.user_id,invoice_number:await invoiceNumber(admin,order.id,now),
    issuer_name:ISSUER.name,issuer_company_number:ISSUER.companyNumber,issuer_registered_office:ISSUER.registeredOffice,
    billing_company:profile?.company_name??null,billing_email:profile?.billing_email??null,
    customer_type:profile?.customer_type??null,billing_address_line1:profile?.billing_address_line1??null,billing_address_line2:profile?.billing_address_line2??null,
    billing_city:profile?.billing_city??null,billing_region:profile?.billing_region??null,billing_postal_code:profile?.billing_postal_code??null,billing_country_code:profile?.billing_country_code??null,
    tax_id:profile?.tax_id??null,tax_id_type:profile?.tax_id_type??null,tax_id_validation_status:profile?.tax_id_validation_status??"unverified",amount_usd:order.amount_usd,
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
    admin.from("buildpulse_ad_products").select("stripe_product_id,stripe_price_id,stripe_payment_link_id,price_usd").eq("id",order.product_id).maybeSingle(),
    admin.from("buildpulse_advertiser_profiles").select("company_name,billing_email,customer_type,billing_address_line1,billing_address_line2,billing_city,billing_region,billing_postal_code,billing_country_code,tax_id,tax_id_type,tax_id_validation_status").eq("user_id",order.user_id).maybeSingle()
  ]);
  const sessionLink=typeof session.payment_link==="string"?session.payment_link:session.payment_link?.id;
  const paymentIntent=typeof session.payment_intent==="string"?session.payment_intent:session.payment_intent?.id??null;
  const amountUsd=Number(session.amount_total??0)/100;
  const validLink=Boolean(product?.stripe_payment_link_id)&&sessionLink===product.stripe_payment_link_id;
  const validAmount=Number.isInteger(session.amount_total)&&session.amount_total===cents(order.amount_usd)&&session.amount_total===cents(product?.price_usd);
  const validCurrency=String(session.currency??"").toLowerCase()==="usd";
  const sessionPrice=typeof session?.line_items?.data?.[0]?.price==="string"?session.line_items.data[0].price:session?.line_items?.data?.[0]?.price?.id;
  const sessionProduct=typeof session?.line_items?.data?.[0]?.price?.product==="string"?session.line_items.data[0].price.product:session?.line_items?.data?.[0]?.price?.product?.id;
  const validPrice=!sessionPrice||sessionPrice===product?.stripe_price_id;
  const validProduct=!sessionProduct||sessionProduct===product?.stripe_product_id;
  if(!validLink||!validAmount||!validCurrency||!validPrice||!validProduct){
    await appendPaymentEvent(admin,event,order.id,"rejected",paymentIntent,amountUsd,{
      checkout_session_id:session.id,payment_link:sessionLink,valid_link:validLink,valid_amount:validAmount,valid_currency:validCurrency,valid_price:validPrice,valid_product:validProduct
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
  const {data:priorRefundEvents}=await admin.from("buildpulse_ad_payment_events").select("observed_amount,metadata")
    .eq("order_id",orderId).eq("crypto_network","stripe").eq("state","rejected");
  const priorCumulative=Math.max(0,...(priorRefundEvents??[])
    .filter((row:any)=>row?.metadata?.kind==="full_refund"||row?.metadata?.kind==="partial_refund")
    .map((row:any)=>Number(row.observed_amount)||0));
  const incrementalRefund=Math.max(0,Math.round((refundedUsd-priorCumulative)*100)/100);
  await appendPaymentEvent(admin,event,orderId,"rejected",paymentIntent,refundedUsd,{
    kind:full?"full_refund":"partial_refund",charge_id:charge.id,amount_refunded:charge.amount_refunded,amount:charge.amount,
    cumulative_refund_usd:refundedUsd,incremental_refund_usd:incrementalRefund
  });
  let creditNoteNumber:string|null=null;
  if(incrementalRefund>0){
    const {data:credit,error:creditError}=await admin.rpc("buildpulse_issue_ad_credit_note",{
      p_order_id:orderId,p_amount_usd:incrementalRefund,p_provider_reference:`stripe:${event.id}`,
      p_reason:full?"full_refund":"partial_refund",
      p_metadata:{stripe_event_id:event.id,charge_id:charge.id,payment_intent:paymentIntent,cumulative_refund_usd:refundedUsd}
    });
    if(creditError)throw creditError;
    creditNoteNumber=Array.isArray(credit)?credit[0]?.credit_note_number??null:credit?.credit_note_number??null;
  }
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
  return {refund:true,full,orderId,incrementalRefund,creditNoteNumber};
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

async function settleSubscriptionCheckout(admin:any,session:any){
  const planTag=String(session?.metadata?.buildpulse_subscription_plan||"");
  if(!planTag)return {ignored:"not_buildpulse_subscription"};
  const [planCode,billingInterval]=planTag.endsWith("_annual")?[planTag.replace("_annual",""),"year"]:[planTag.replace("_monthly",""),"month"];
  const normalizedPlan=planCode==="pro"?"professional":planCode;
  const {data:plan}=await admin.from("buildpulse_subscription_plans").select("*").eq("code",normalizedPlan).eq("active",true).maybeSingle();
  if(!plan)return {ignored:"subscription_plan_not_found"};
  const expectedPrice=billingInterval==="year"?plan.stripe_annual_price_id:plan.stripe_monthly_price_id;
  const sessionPrice=typeof session?.line_items?.data?.[0]?.price==="string"?session.line_items.data[0].price:session?.line_items?.data?.[0]?.price?.id;
  if(sessionPrice&&sessionPrice!==expectedPrice)return {ignored:"subscription_price_mismatch"};
  const email=String(session?.customer_details?.email||session?.customer_email||"").trim().toLowerCase();
  if(!email)return {ignored:"subscription_email_missing"};
  const customer=typeof session.customer==="string"?session.customer:session.customer?.id??null;
  const subscription=typeof session.subscription==="string"?session.subscription:session.subscription?.id??null;
  if(!subscription)return {ignored:"subscription_id_missing"};
  const now=new Date().toISOString();
  const {error}=await admin.from("buildpulse_intelligence_subscriptions").upsert({
    email,plan_code:normalizedPlan,billing_interval:billingInterval,status:session.payment_status==="paid"||session.payment_status==="no_payment_required"?"active":"pending",
    stripe_customer_id:customer,stripe_subscription_id:subscription,stripe_checkout_session_id:session.id,updated_at:now
  },{onConflict:"stripe_subscription_id"});
  if(error)throw error;
  return {subscriptionActivated:true,plan:normalizedPlan,billingInterval};
}
async function syncSubscription(admin:any,subscription:any){
  const id=String(subscription?.id||"");if(!id)return {ignored:"subscription_id_missing"};
  const stripeStatus=String(subscription?.status||"");
  const status=stripeStatus==="active"||stripeStatus==="trialing"?"active":stripeStatus==="past_due"||stripeStatus==="unpaid"?"past_due":stripeStatus==="paused"?"paused":stripeStatus==="canceled"?"cancelled":"pending";
  const periodEnd=subscription?.current_period_end?new Date(Number(subscription.current_period_end)*1000).toISOString():null;
  const cancelledAt=subscription?.canceled_at?new Date(Number(subscription.canceled_at)*1000).toISOString():null;
  const {error}=await admin.from("buildpulse_intelligence_subscriptions").update({status,current_period_end:periodEnd,cancelled_at:cancelledAt,updated_at:new Date().toISOString()}).eq("stripe_subscription_id",id);
  if(error)throw error;return {subscriptionSynced:true,status};
}

async function syncAccountingInvoice(admin:any,event:any,invoice:any){
  const stripeInvoiceId=String(invoice?.id||"");if(!stripeInvoiceId)return {ignored:"invoice_id_missing"};
  const issuedAt=invoice?.created?new Date(Number(invoice.created)*1000).toISOString():new Date().toISOString();
  const paidAt=event.type==="invoice.paid"?(invoice?.status_transitions?.paid_at?new Date(Number(invoice.status_transitions.paid_at)*1000).toISOString():new Date().toISOString()):null;
  const currency=String(invoice?.currency||"").toUpperCase();if(!/^[A-Z]{3}$/.test(currency))return {ignored:"invoice_currency_missing"};
  const gross=Number(invoice?.total??invoice?.amount_due??0)/100;
  const netRaw=invoice?.total_excluding_tax??invoice?.subtotal_excluding_tax??invoice?.subtotal??invoice?.total??0;
  const net=Number(netRaw)/100,tax=Math.max(0,gross-net);
  const stripeCustomer=typeof invoice.customer==="string"?invoice.customer:invoice.customer?.id??null;
  const email=String(invoice?.customer_email||invoice?.customer_details?.email||"").trim().toLowerCase()||null;
  const {data:entity}=await admin.from("buildpulse_accounting_entities").select("id,base_currency").eq("is_default",true).maybeSingle();
  if(!entity)return {ignored:"accounting_entity_missing"};
  let customerId:null|string=null;
  if(stripeCustomer||email){
    let existing:any=null;
    if(stripeCustomer){const r=await admin.from("buildpulse_accounting_customers").select("id").eq("stripe_customer_id",stripeCustomer).maybeSingle();existing=r.data}
    if(!existing&&email){const r=await admin.from("buildpulse_accounting_customers").select("id").ilike("email",email).maybeSingle();existing=r.data}
    if(existing)customerId=existing.id;
    else{
      const {data:newCustomer}=await admin.from("buildpulse_accounting_customers").insert({
        stripe_customer_id:stripeCustomer,email,legal_name:invoice?.customer_name??null,
        country_code:invoice?.customer_address?.country??null,billing_address:invoice?.customer_address??{},
        location_evidence:{source:"stripe_invoice",invoice_id:stripeInvoiceId}
      }).select("id").single();customerId=newCustomer?.id??null;
    }
  }
  const {data:existingDoc}=await admin.from("buildpulse_accounting_documents").select("id,document_number").eq("stripe_invoice_id",stripeInvoiceId).maybeSingle();
  let documentNumber=existingDoc?.document_number??null;
  if(!documentNumber){const {data:num,error:numErr}=await admin.rpc("buildpulse_next_document_number",{p_entity_id:entity.id,p_document_type:"invoice",p_issued_at:issuedAt});if(numErr||!num)throw new Error("document_number_allocation_failed");documentNumber=num}
  const subscriptionId=typeof invoice.subscription==="string"?invoice.subscription:invoice.subscription?.id??null;
  if(subscriptionId){
    const entitlementStatus=event.type==="invoice.paid"?"active":"past_due";
    await admin.from("buildpulse_intelligence_subscriptions").update({status:entitlementStatus,updated_at:new Date().toISOString()}).eq("stripe_subscription_id",subscriptionId);
  }
  const paymentIntent=typeof invoice.payment_intent==="string"?invoice.payment_intent:invoice.payment_intent?.id??null;
  const status=event.type==="invoice.paid"?"paid":String(invoice?.status||"open");
  const snapshot={stripe_event_id:event.id,stripe_invoice_id:stripeInvoiceId,automatic_tax:invoice?.automatic_tax??null,total_taxes:invoice?.total_taxes??null,customer_tax_ids:invoice?.customer_tax_ids??null,billing_reason:invoice?.billing_reason??null,hosted_invoice_url:invoice?.hosted_invoice_url??null,base_currency:entity.base_currency,fx_posting_required:currency!==String(entity.base_currency).toUpperCase()};
  const row={entity_id:entity.id,customer_id:customerId,document_type:"invoice",document_number:documentNumber,currency,net_amount:net,tax_amount:tax,gross_amount:gross,tax_jurisdiction:invoice?.customer_address?.country??null,tax_treatment:null,tax_rate:net>0?tax/net:null,reverse_charge:false,stripe_invoice_id:stripeInvoiceId,stripe_payment_intent_id:paymentIntent,stripe_subscription_id:subscriptionId,provider_pdf_url:invoice?.invoice_pdf??null,status,issued_at:issuedAt,due_at:invoice?.due_date?new Date(Number(invoice.due_date)*1000).toISOString():null,paid_at:paidAt,immutable_snapshot:snapshot};
  const {data:doc,error:docErr}=await admin.from("buildpulse_accounting_documents").upsert(row,{onConflict:"stripe_invoice_id"}).select("id,document_number").single();if(docErr)throw docErr;
  let journalId=null;if(status==="paid"&&!snapshot.fx_posting_required){const {data:j,error:jErr}=await admin.rpc("buildpulse_post_paid_invoice_journal",{p_document_id:doc.id});if(jErr)throw jErr;journalId=j}
  return {accountingInvoiceSynced:true,documentId:doc.id,documentNumber:doc.document_number,status,fxPostingRequired:snapshot.fx_posting_required,journalId};
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
    if((type==="checkout.session.completed"||type==="checkout.session.async_payment_succeeded")&&object?.mode==="subscription")result=await settleSubscriptionCheckout(admin,object);
    else if(type==="checkout.session.completed"||type==="checkout.session.async_payment_succeeded")result=await settleCheckout(admin,event,object);
    else if(type==="checkout.session.async_payment_failed"||type==="checkout.session.expired")result={ignored:type};
    else if(type==="charge.refunded")result=await handleRefund(admin,event,object);
    else if(type==="charge.dispute.created"||type==="charge.dispute.closed")result=await handleDispute(admin,event,object);
    else if(type==="customer.subscription.updated"||type==="customer.subscription.deleted")result=await syncSubscription(admin,object);
    else if(type==="invoice.paid"||type==="invoice.payment_failed")result=await syncAccountingInvoice(admin,event,object);
    return reply({ok:true,...result});
  }catch(error){
    console.error("buildpulse_stripe_webhook_error",error);
    return reply({ok:false,error:"webhook_processing_failed"},500);
  }
});
