import {createHmac,timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getServerEnv} from "@/config/env";

function verifyStripeSignature(raw:string,header:string,secret:string){
  const parts=header.split(",").map(x=>x.trim());
  const timestamp=parts.find(x=>x.startsWith("t="))?.slice(2);
  const signatures=parts.filter(x=>x.startsWith("v1=")).map(x=>x.slice(3));
  if(!timestamp||!signatures.length)return false;
  const age=Math.abs(Date.now()/1000-Number(timestamp));
  if(!Number.isFinite(age)||age>300)return false;
  const expected=createHmac("sha256",secret).update(`${timestamp}.${raw}`).digest("hex");
  return signatures.some(sig=>{
    const a=Buffer.from(expected,"hex"),b=Buffer.from(sig,"hex");
    return a.length===b.length&&timingSafeEqual(a,b);
  });
}

export async function POST(req:Request){
  const secret=getServerEnv().STRIPE_WEBHOOK_SECRET??"";
  const signature=req.headers.get("stripe-signature")??"";
  const raw=await req.text();
  if(!secret||!verifyStripeSignature(raw,signature,secret))return NextResponse.json({ok:false},{status:401});
  let event:any;
  try{event=JSON.parse(raw)}catch{return NextResponse.json({ok:false},{status:400})}
  const admin=createAdminClient();
  if(!admin)return NextResponse.json({ok:false},{status:503});
  const type=String(event?.type??"");
  const session=event?.data?.object??{};
  const orderId=session?.metadata?.buildpulse_order_id||session?.client_reference_id;
  if(!orderId)return NextResponse.json({ok:true,ignored:true});

  const {data:seen}=await admin.from("buildpulse_ad_payment_events").select("id,state").eq("provider_event_key",String(event.id)).maybeSingle();
  if(seen)return NextResponse.json({ok:true,idempotent:true});

  if(type==="checkout.session.expired"){
    const now=new Date().toISOString();
    await Promise.all([
      admin.from("buildpulse_ad_orders").update({status:"draft",payment_reference:null,updated_at:now}).eq("id",orderId).eq("status","awaiting_payment").eq("payment_reference",session.id),
      admin.from("buildpulse_billing_invoices").update({status:"void",updated_at:now}).eq("order_id",orderId).eq("payment_reference",session.id)
    ]);
    return NextResponse.json({ok:true,state:"expired"});
  }

  if(!["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(type))return NextResponse.json({ok:true,ignored:true});
  if(session.payment_status!=="paid")return NextResponse.json({ok:true,ignored:true,state:session.payment_status??"unpaid"});

  const amountUsd=Number(session.amount_total??0)/100;
  const paymentIntent=typeof session.payment_intent==="string"?session.payment_intent:null;
  const now=new Date().toISOString();
  const {error:eventError}=await admin.from("buildpulse_ad_payment_events").insert({
    order_id:orderId,provider_event_key:String(event.id),crypto_asset:"USD",crypto_network:"stripe",
    tx_hash:paymentIntent,observed_amount:amountUsd,confirmations:1,state:"confirmed",
    metadata:{provider:"stripe",checkout_session_id:session.id,payment_intent:paymentIntent,customer_email:session.customer_details?.email??session.customer_email??null}
  });
  if(eventError){
    if((eventError as any).code==="23505")return NextResponse.json({ok:true,idempotent:true});
    return NextResponse.json({ok:false,error:"event_persistence_failed"},{status:500});
  }
  await Promise.all([
    admin.from("buildpulse_ad_orders").update({status:"review",paid_tx_hash:paymentIntent,paid_at:now,payment_method:"stripe",payment_provider:"stripe",payment_reference:session.id,updated_at:now}).eq("id",orderId).in("status",["awaiting_payment","payment_detected"]),
    admin.from("buildpulse_billing_invoices").update({status:"paid",paid_at:now,payment_method:"stripe",payment_reference:session.id,updated_at:now,metadata:{stripe_checkout_session_id:session.id,stripe_payment_intent:paymentIntent}}).eq("order_id",orderId)
  ]);
  return NextResponse.json({ok:true,state:"confirmed"});
}
