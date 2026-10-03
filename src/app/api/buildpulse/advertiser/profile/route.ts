import {NextResponse} from "next/server";
import {z} from "zod";
import {createClient} from "@/lib/supabase/server";

const optionalText=(max:number)=>z.string().trim().max(max).optional().default("");
const schema=z.object({
  companyName:optionalText(160),
  billingEmail:z.string().email().optional().or(z.literal("")),
  websiteUrl:z.string().url().optional().or(z.literal("")),
  customerType:z.enum(["b2b","b2c"]).default("b2b"),
  billingAddressLine1:optionalText(180),
  billingAddressLine2:optionalText(180),
  billingCity:optionalText(120),
  billingRegion:optionalText(120),
  billingPostalCode:optionalText(32),
  billingCountryCode:z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).optional().or(z.literal("")),
  taxId:optionalText(80),
  taxIdType:optionalText(40)
});

export async function POST(request:Request){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Invalid advertiser profile",issues:parsed.error.flatten()},{status:400});
  if(parsed.data.websiteUrl&&!parsed.data.websiteUrl.startsWith("https://"))return NextResponse.json({error:"Company website must use HTTPS"},{status:400});

  const {data:existing,error:lookupError}=await supabase.from("buildpulse_advertiser_profiles").select("user_id,status").eq("user_id",user.id).maybeSingle();
  if(lookupError)return NextResponse.json({error:"Advertiser profile could not be loaded"},{status:500});
  if(existing&&existing.status!=="active")return NextResponse.json({error:"Advertiser profile is unavailable"},{status:403});

  const payload={
    user_id:user.id,
    company_name:parsed.data.companyName||null,
    billing_email:parsed.data.billingEmail||user.email||null,
    website_url:parsed.data.websiteUrl||null,
    customer_type:parsed.data.customerType,
    billing_address_line1:parsed.data.billingAddressLine1||null,
    billing_address_line2:parsed.data.billingAddressLine2||null,
    billing_city:parsed.data.billingCity||null,
    billing_region:parsed.data.billingRegion||null,
    billing_postal_code:parsed.data.billingPostalCode||null,
    billing_country_code:parsed.data.billingCountryCode||null,
    tax_id:parsed.data.taxId||null,
    tax_id_type:parsed.data.taxIdType||null,
    tax_id_validation_status:"unverified",
    status:"active",
    updated_at:new Date().toISOString()
  };
  const result=existing
    ?await supabase.from("buildpulse_advertiser_profiles").update(payload).eq("user_id",user.id).select("user_id,status,tax_id_validation_status").single()
    :await supabase.from("buildpulse_advertiser_profiles").insert(payload).select("user_id,status,tax_id_validation_status").single();
  if(result.error||!result.data)return NextResponse.json({error:"Advertiser profile could not be saved"},{status:500});
  return NextResponse.json({ok:true,profile:result.data});
}
