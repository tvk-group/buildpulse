import Link from "next/link";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";
import {getSupabasePublicConfig} from "@/lib/supabase/env";
import {AdvertisingInventory} from "@/components/buildpulse/AdvertisingInventory";

export const dynamic="force-dynamic";
export const metadata={title:"Advertise",description:"Self-service advertising inventory for BuildPulse Global Technology & Digital Intelligence.",alternates:{canonical:"/advertise"},openGraph:{url:"/advertise"}};

export default async function Advertise(){
  const {url,key,configured}=getSupabasePublicConfig();
  const data=configured?(await createSupabaseClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}).from("buildpulse_ad_products").select("code,name,placement,width_px,height_px,max_copy_chars,price_usd,duration_days").eq("active",true).order("price_usd")).data:[];
  return <main className="min-h-screen bg-[#f6f4ee] text-[#17202a]"><section className="mx-auto max-w-6xl px-6 py-16">
    <p className="text-xs font-black tracking-[.2em] text-[#0b6b63]">TVK BUILDPULSE // ADVERTISING</p>
    <h1 className="mt-4 max-w-4xl text-5xl font-black">Reach readers following the infrastructure of the digital economy.</h1>
    <p className="mt-5 max-w-3xl text-[#53606b]">Choose a placement, create up to 300 characters of sponsor copy, provide your destination and creative, then continue through the advertiser account and payment workflow. Every paid placement is clearly labeled.</p>
    <AdvertisingInventory products={(data??[]) as any}/><p className="mt-10 max-w-3xl text-sm text-[#65717c]">Payment does not bypass content controls. Campaigns remain subject to automated safety checks and publication policy before activation. Pricing shown here is the configured launch inventory and can be revised centrally.</p>
  </section></main>
}
