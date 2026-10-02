import {timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {z} from "zod";
import {getServerEnv} from "@/config/env";
import {createAdminClient} from "@/lib/supabase/admin";
const schema=z.object({orderId:z.string().uuid(),eventKey:z.string().trim().min(8).max(200),asset:z.string().trim().min(2).max(20),network:z.string().trim().min(2).max(40),txHash:z.string().trim().max(200).optional(),amount:z.coerce.number().positive(),confirmations:z.coerce.number().int().min(0).max(1000000),state:z.enum(["observed","confirmed","rejected","reorged"])});
export async function POST(req:Request){
 const secret=getServerEnv().BUILDPULSE_AD_PAYMENT_WEBHOOK_SECRET??"",supplied=req.headers.get("x-buildpulse-payment-secret")??"";const a=Buffer.from(secret),b=Buffer.from(supplied);if(!secret||a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({ok:false},{status:401});
 const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({ok:false,error:"invalid_event"},{status:400});
 const admin=createAdminClient();if(!admin)return NextResponse.json({ok:false},{status:503});
 const {data:seen}=await admin.from("buildpulse_ad_payment_events").select("id,state").eq("provider_event_key",parsed.data.eventKey).maybeSingle();if(seen)return NextResponse.json({ok:true,idempotent:true,state:seen.state});
 const {data:quote}=await admin.from("buildpulse_ad_payment_quotes").select("id,asset,network,expected_amount,state,expires_at,required_confirmations").eq("order_id",parsed.data.orderId).in("state",["open","observed"]).order("created_at",{ascending:false}).limit(1).maybeSingle();
 if(!quote)return NextResponse.json({ok:false,error:"open_quote_not_found"},{status:409});
 const matches=quote.asset.toUpperCase()===parsed.data.asset.toUpperCase()&&quote.network.toLowerCase()===parsed.data.network.toLowerCase();
 const sufficient=parsed.data.amount>=Number(quote.expected_amount),notExpired=Date.parse(quote.expires_at)>=Date.now();
 const enoughConfirmations=parsed.data.confirmations>=Number(quote.required_confirmations??1);
 const acceptedState=parsed.data.state==="confirmed"&&(!matches||!sufficient||!notExpired)?"rejected":parsed.data.state==="confirmed"&&!enoughConfirmations?"observed":parsed.data.state;
 const {error:eventError}=await admin.from("buildpulse_ad_payment_events").insert({order_id:parsed.data.orderId,provider_event_key:parsed.data.eventKey,crypto_asset:parsed.data.asset.toUpperCase(),crypto_network:parsed.data.network,tx_hash:parsed.data.txHash??null,observed_amount:parsed.data.amount,confirmations:parsed.data.confirmations,state:acceptedState,metadata:{quote_id:quote.id,asset_network_match:matches,sufficient_amount:sufficient,quote_unexpired:notExpired,required_confirmations:quote.required_confirmations,confirmation_threshold_met:enoughConfirmations,provider:"crypto_observer"}});
 if(eventError)return NextResponse.json({ok:false,error:"event_persistence_failed"},{status:500});
 const now=new Date().toISOString();
 if(acceptedState==="observed"){
   await admin.from("buildpulse_ad_payment_quotes").update({state:"observed"}).eq("id",quote.id).eq("state","open");
   await admin.from("buildpulse_ad_orders").update({status:"payment_detected",paid_tx_hash:parsed.data.txHash??null,updated_at:now}).eq("id",parsed.data.orderId).eq("status","awaiting_payment");
 }
 if(acceptedState==="confirmed"){
   await Promise.all([
     admin.from("buildpulse_ad_payment_quotes").update({state:"confirmed"}).eq("id",quote.id),
     admin.from("buildpulse_ad_orders").update({status:"review",paid_tx_hash:parsed.data.txHash??null,paid_at:now,payment_method:parsed.data.asset.toUpperCase(),payment_provider:"crypto",updated_at:now}).eq("id",parsed.data.orderId).in("status",["awaiting_payment","payment_detected"]),
     admin.from("buildpulse_billing_invoices").update({status:"paid",paid_at:now,payment_method:parsed.data.asset.toUpperCase(),payment_reference:quote.id,updated_at:now,metadata:{tx_hash:parsed.data.txHash??null,asset:parsed.data.asset.toUpperCase(),network:parsed.data.network,amount:parsed.data.amount}}).eq("order_id",parsed.data.orderId)
   ]);
 }
 if(acceptedState==="reorged"){
   await Promise.all([
     admin.from("buildpulse_ad_payment_quotes").update({state:"observed"}).eq("id",quote.id),
     admin.from("buildpulse_billing_invoices").update({status:"open",paid_at:null,updated_at:now}).eq("order_id",parsed.data.orderId),
     admin.from("buildpulse_ad_orders").update({status:"payment_detected",paid_at:null,updated_at:now}).eq("id",parsed.data.orderId).in("status",["review","approved","scheduled","active"])
   ]);
 }
 return NextResponse.json({ok:true,state:acceptedState,advancedToReview:acceptedState==="confirmed"});
}
