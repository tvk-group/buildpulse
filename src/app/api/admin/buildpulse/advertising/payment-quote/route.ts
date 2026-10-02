import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {createAdminClient} from "@/lib/supabase/admin";
import {requireBuildPulseAdmin} from "@/lib/buildpulse/admin-auth";
const schema=z.object({orderId:z.string().uuid(),asset:z.string().trim().min(2).max(20),network:z.string().trim().min(2).max(40),destination:z.string().trim().min(8).max(200),memo:z.string().trim().max(200).optional(),rateUsd:z.coerce.number().positive(),ttlMinutes:z.coerce.number().int().min(5).max(1440).default(30),requiredConfirmations:z.coerce.number().int().min(1).max(1000).default(1)});
export async function POST(req:NextRequest){
 const auth=await requireBuildPulseAdmin();if(!auth.ok)return NextResponse.json({ok:false},{status:401});
 const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({ok:false,error:"invalid_quote"},{status:400});
 const admin=createAdminClient();if(!admin)return NextResponse.json({ok:false},{status:503});
 const {data:order}=await admin.from("buildpulse_ad_orders").select("id,status,amount_usd").eq("id",parsed.data.orderId).single();if(!order||order.status!=="draft")return NextResponse.json({ok:false,error:"draft_order_required"},{status:409});
 const usd=Number(order.amount_usd),rate=parsed.data.rateUsd,expected=usd/rate;if(!Number.isFinite(expected)||expected<=0)return NextResponse.json({ok:false,error:"invalid_rate"},{status:400});
 const now=new Date(),expires=new Date(now.getTime()+parsed.data.ttlMinutes*60000);
 const asset=parsed.data.asset.toUpperCase();
 const {data:quote,error}=await admin.from("buildpulse_ad_payment_quotes").insert({order_id:order.id,asset,network:parsed.data.network,destination:parsed.data.destination,memo:parsed.data.memo??null,usd_amount:usd,rate_usd:rate,expected_amount:expected,quoted_at:now.toISOString(),expires_at:expires.toISOString(),required_confirmations:parsed.data.requiredConfirmations,state:"open"}).select("id,asset,network,expected_amount,destination,memo,expires_at,required_confirmations").single();
 if(error||!quote)return NextResponse.json({ok:false,error:"quote_persistence_failed"},{status:500});
 const {error:updateError}=await admin.from("buildpulse_ad_orders").update({status:"awaiting_payment",payment_method:asset,payment_provider:"crypto",crypto_asset:quote.asset,crypto_network:quote.network,expected_crypto_amount:quote.expected_amount,payment_address:quote.destination,payment_reference:quote.id,updated_at:now.toISOString()}).eq("id",order.id).eq("status","draft");
 if(updateError)return NextResponse.json({ok:false,error:"order_transition_failed"},{status:500});
 return NextResponse.json({ok:true,quote,issuedBy:auth.email});
}
