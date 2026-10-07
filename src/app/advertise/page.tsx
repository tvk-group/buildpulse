import Link from "next/link";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";
import {getSupabasePublicConfig} from "@/lib/supabase/env";
import {LocalizedPrice} from "@/components/buildpulse/LocalizedPrice";

export const dynamic="force-dynamic";
export const metadata={title:"Advertise",description:"Self-service advertising inventory for BuildPulse Global Technology & Digital Intelligence.",alternates:{canonical:"/advertise"},openGraph:{url:"/advertise"}};

export default async function Advertise(){
  const {url,key,configured}=getSupabasePublicConfig();
  const data=configured?(await createSupabaseClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}).from("buildpulse_ad_products").select("code,name,placement,width_px,height_px,max_copy_chars,price_usd,duration_days").eq("active",true).order("price_usd")).data:[];
  return <main className="min-h-screen bg-[#f6f4ee] text-[#17202a]"><section className="mx-auto max-w-6xl px-6 py-16">
    <p className="text-xs font-black tracking-[.2em] text-[#0b6b63]">TVK BUILDPULSE // ADVERTISING</p>
    <h1 className="mt-4 max-w-4xl text-5xl font-black">Reach readers following the infrastructure of the digital economy.</h1>
    <p className="mt-5 max-w-3xl text-[#53606b]">Choose a placement, create up to 300 characters of sponsor copy, provide your destination and creative, then continue through the advertiser account and payment workflow. Every paid placement is clearly labeled.</p>
    <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{(data??[]).map(x=><article key={x.code} className="rounded-2xl border border-[#17202a]/15 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-[#65717c]">{x.placement.replaceAll("_"," ")}</p>
      <h2 className="mt-2 text-2xl font-black">{x.name}</h2>
      <p className="mt-3 text-sm text-[#53606b]">{x.width_px&&x.height_px?`${x.width_px} × ${x.height_px}px · `:""}up to {x.max_copy_chars} characters · {x.duration_days} day{x.duration_days===1?"":"s"}</p>
      <p className="mt-5 text-3xl font-black"><LocalizedPrice value={x.price_usd} maximumFractionDigits={0}/></p>
      <Link href={`/advertiser?product=${x.code}`} className="mt-5 inline-block rounded-xl bg-[#17202a] px-5 py-3 font-bold text-white">Create campaign →</Link>
    </article>)}</div>
    <div className="mt-10 grid gap-4 rounded-2xl border border-[#17202a]/15 bg-white p-6 md:grid-cols-2"><label className="text-sm font-black">Billboard country / market<select className="mt-2 w-full rounded-xl border px-4 py-3 font-normal" defaultValue="GLOBAL"><option value="GLOBAL">Global · all countries</option><option value="GB">United Kingdom</option><option value="DE">Germany</option><option value="TR">Türkiye</option><option value="US">United States</option><option value="AE">United Arab Emirates</option><option value="CH">Switzerland</option><option value="FR">France</option><option value="IT">Italy</option><option value="ES">Spain</option></select></label><label className="text-sm font-black">Display currency<select className="mt-2 w-full rounded-xl border px-4 py-3 font-normal" defaultValue="USD"><option>USD</option><option>GBP</option><option>EUR</option><option>TRY</option><option>AED</option><option>CHF</option></select></label><p className="text-sm leading-6 text-[#53606b] md:col-span-2">BuildPulse localizes displayed prices using the current currency context. Country inventory and currency are presentation and targeting choices; checkout records retain the configured product price and applicable billing/tax controls.</p></div><p className="mt-10 max-w-3xl text-sm text-[#65717c]">Payment does not bypass content controls. Campaigns remain subject to automated safety checks and publication policy before activation. Pricing shown here is the configured launch inventory and can be revised centrally.</p>
  </section></main>
}
