import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSafeAdDestination,assertSafeAdDestination } from "@/lib/buildpulse/ad-destination";

const schema=z.object({
  productCode:z.string().trim().min(1).max(64),
  headline:z.string().trim().max(120).optional().default(""),
  copyText:z.string().trim().min(1).max(300),
  destinationUrl:z.string().url().refine(isSafeAdDestination,"Public HTTPS destination required"),
});

export async function POST(request:Request){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401});

  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Invalid campaign draft",issues:parsed.error.flatten()},{status:400});
  try{await assertSafeAdDestination(parsed.data.destinationUrl)}catch{return NextResponse.json({error:"Destination must resolve only to public internet addresses"},{status:400})}

  const admin=createAdminClient();
  if(!admin)return NextResponse.json({error:"Service unavailable"},{status:503});

  const [{data:profile,error:profileError},{data:product,error:productError}]=await Promise.all([
    admin.from("buildpulse_advertiser_profiles").select("user_id,status").eq("user_id",user.id).eq("status","active").maybeSingle(),
    admin.from("buildpulse_ad_products").select("id,code,price_usd,max_copy_chars,duration_days,active").eq("code",parsed.data.productCode).eq("active",true).maybeSingle(),
  ]);
  if(profileError||!profile)return NextResponse.json({error:"Active advertiser profile required"},{status:403});
  if(productError||!product)return NextResponse.json({error:"Advertising product unavailable"},{status:400});
  if(parsed.data.copyText.length>product.max_copy_chars)return NextResponse.json({error:`Copy exceeds the ${product.max_copy_chars}-character product limit`},{status:400});

  const {data:order,error}=await admin.from("buildpulse_ad_orders").insert({
    user_id:user.id,product_id:product.id,headline:parsed.data.headline||null,copy_text:parsed.data.copyText,
    destination_url:parsed.data.destinationUrl,status:"draft",amount_usd:product.price_usd,
  }).select("id,status,amount_usd").single();
  if(error||!order)return NextResponse.json({error:"Campaign draft could not be created"},{status:500});
  return NextResponse.json({ok:true,order});
}
