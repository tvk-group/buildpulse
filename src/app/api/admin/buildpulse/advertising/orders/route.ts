import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {createAdminClient} from "@/lib/supabase/admin";
import {requireBuildPulseAdmin} from "@/lib/buildpulse/admin-auth";
const schema=z.object({orderId:z.string().uuid(),action:z.enum(["approve","reject","schedule"]),startsAt:z.string().datetime().optional(),notes:z.string().trim().max(2000).optional()});
export async function POST(req:NextRequest){
 const auth=await requireBuildPulseAdmin();if(!auth.ok)return NextResponse.json({ok:false},{status:401});
 const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({ok:false,error:"invalid_request"},{status:400});
 const admin=createAdminClient();if(!admin)return NextResponse.json({ok:false},{status:503});
 const {data:order}=await admin.from("buildpulse_ad_orders").select("id,product_id,status").eq("id",parsed.data.orderId).single();if(!order)return NextResponse.json({ok:false,error:"order_not_found"},{status:404});
 if(parsed.data.action==="reject"){const {error}=await admin.from("buildpulse_ad_orders").update({status:"rejected",updated_at:new Date().toISOString()}).eq("id",order.id).in("status",["payment_detected","review","approved"]);return error?NextResponse.json({ok:false},{status:500}):NextResponse.json({ok:true,state:"rejected"});}
 const {data:payment}=await admin.from("buildpulse_ad_payment_events").select("id,state").eq("order_id",order.id).order("observed_at",{ascending:false}).limit(1).maybeSingle();
 if(!payment||payment.state!=="confirmed")return NextResponse.json({ok:false,error:"confirmed_payment_required"},{status:409});
 const {data:creatives}=await admin.from("buildpulse_ad_creatives").select("id,review_state").eq("order_id",order.id);
 if(creatives?.some(c=>c.review_state!=="approved"))return NextResponse.json({ok:false,error:"creative_review_incomplete"},{status:409});
 if(parsed.data.action==="approve"){if((await admin.from("buildpulse_ad_products").select("width_px,height_px").eq("id",order.product_id).single()).data?.width_px&&!creatives?.length)return NextResponse.json({ok:false,error:"approved_creative_required"},{status:409});const {error}=await admin.from("buildpulse_ad_orders").update({status:"approved",updated_at:new Date().toISOString()}).eq("id",order.id).in("status",["payment_detected","review"]);return error?NextResponse.json({ok:false},{status:500}):NextResponse.json({ok:true,state:"approved",reviewedBy:auth.email});}
 if(order.status!=="approved"||!parsed.data.startsAt)return NextResponse.json({ok:false,error:"approved_order_and_start_required"},{status:409});
 const {data:product}=await admin.from("buildpulse_ad_products").select("duration_days,width_px,height_px").eq("id",order.product_id).single();if(!product)return NextResponse.json({ok:false,error:"product_not_found"},{status:404});
 const start=new Date(parsed.data.startsAt);if(Number.isNaN(start.getTime())||start.getTime()<Date.now()-60000)return NextResponse.json({ok:false,error:"invalid_start"},{status:400});
 const end=new Date(start.getTime()+product.duration_days*86400000);
 const {data:scheduled,error}=await (admin.rpc as any)("buildpulse_schedule_ad_order",{p_order_id:order.id,p_starts_at:start.toISOString(),p_ends_at:end.toISOString()});
 if(error)return NextResponse.json({ok:false,error:(error as any).code==="23P01"?"inventory_conflict":"schedule_failed"},{status:(error as any).code==="23P01"?409:500});if(!scheduled)return NextResponse.json({ok:false,error:"order_no_longer_schedulable"},{status:409});return NextResponse.json({ok:true,state:"scheduled",startsAt:start.toISOString(),endsAt:end.toISOString(),scheduledBy:auth.email});
}
