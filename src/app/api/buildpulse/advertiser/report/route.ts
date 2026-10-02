import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
export async function GET(){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
 const admin=createAdminClient();if(!admin)return NextResponse.json({error:"Service unavailable"},{status:503});
 const {data:orders}=await admin.from("buildpulse_ad_orders").select("id,headline,status,starts_at,ends_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100);
 const ids=(orders??[]).map(o=>o.id);if(!ids.length)return NextResponse.json({ok:true,campaigns:[]});
 const {data:events}=await admin.from("buildpulse_ad_events").select("order_id,event_type,is_verified,occurred_at").in("order_id",ids).eq("is_verified",true).limit(10000);
 const counts=new Map<string,{impressions:number;clicks:number}>();for(const event of events??[]){const current=counts.get(event.order_id)??{impressions:0,clicks:0};if(event.event_type==="impression")current.impressions++;if(event.event_type==="click")current.clicks++;counts.set(event.order_id,current)}
 return NextResponse.json({ok:true,campaigns:(orders??[]).map(order=>{const c=counts.get(order.id)??{impressions:0,clicks:0};return {...order,...c,ctr:c.impressions?Number(((c.clicks/c.impressions)*100).toFixed(2)):0}})});
}
