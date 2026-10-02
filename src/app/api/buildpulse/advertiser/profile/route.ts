import {NextResponse} from "next/server";
import {z} from "zod";
import {createClient} from "@/lib/supabase/server";

const schema=z.object({
  companyName:z.string().trim().max(160).optional().default(""),
  billingEmail:z.string().email().optional().or(z.literal("")),
  websiteUrl:z.string().url().optional().or(z.literal(""))
});

export async function POST(request:Request){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Invalid advertiser profile"},{status:400});
  if(parsed.data.websiteUrl&&!parsed.data.websiteUrl.startsWith("https://"))return NextResponse.json({error:"Company website must use HTTPS"},{status:400});

  const {data:existing,error:lookupError}=await supabase.from("buildpulse_advertiser_profiles").select("user_id,status").eq("user_id",user.id).maybeSingle();
  if(lookupError)return NextResponse.json({error:"Advertiser profile could not be loaded"},{status:500});
  if(existing&&existing.status!=="active")return NextResponse.json({error:"Advertiser profile is unavailable"},{status:403});

  const payload={
    user_id:user.id,
    company_name:parsed.data.companyName||null,
    billing_email:parsed.data.billingEmail||user.email||null,
    website_url:parsed.data.websiteUrl||null,
    status:"active",
    updated_at:new Date().toISOString()
  };
  const result=existing
    ?await supabase.from("buildpulse_advertiser_profiles").update(payload).eq("user_id",user.id).select("user_id,status").single()
    :await supabase.from("buildpulse_advertiser_profiles").insert(payload).select("user_id,status").single();
  if(result.error||!result.data)return NextResponse.json({error:"Advertiser profile could not be saved"},{status:500});
  return NextResponse.json({ok:true,profile:result.data});
}
