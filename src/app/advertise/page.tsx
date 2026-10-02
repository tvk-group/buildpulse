import Link from "next/link";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";
import {getSupabasePublicConfig} from "@/lib/supabase/env";

export const dynamic="force-dynamic";
export const metadata={title:"Advertise with BuildPulse",description:"Self-service advertising inventory for BuildPulse Global Technology & Digital Intelligence."};

export default async function Advertise(){
  const {url,key}=getSupabasePublicConfig();
  const publicDb=createSupabaseClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data}=await publicDb.from("buildpulse_ad_products")
    .select("code,name,placement,width_px,height_px,max_copy_chars,price_usd,duration_days")
    .eq("active",true).order("price_usd");
  return <main className="min-h-screen bg-slate-950 text-white"><section className="mx-auto max-w-6xl px-6 py-20">
    <p className="text-xs font-black tracking-[.2em] text-slate-400">TVK BUILDPULSE // ADVERTISING</p>
    <h1 className="mt-4 max-w-4xl text-5xl font-black">Reach readers following the infrastructure of the digital economy.</h1>
    <p className="mt-5 max-w-3xl text-slate-300">Choose a placement, create up to 300 characters of sponsor copy, provide your destination and creative, then continue through the advertiser account and payment workflow. Every paid placement is clearly labeled.</p>
    <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{(data??[]).map(x=><article key={x.code} className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{x.placement.replaceAll("_"," ")}</p>
      <h2 className="mt-2 text-2xl font-black">{x.name}</h2>
      <p className="mt-3 text-sm text-slate-300">{x.width_px&&x.height_px?`${x.width_px} × ${x.height_px}px · `:""}up to {x.max_copy_chars} characters · {x.duration_days} day{x.duration_days===1?"":"s"}</p>
      <p className="mt-5 text-3xl font-black">USD {Number(x.price_usd).toLocaleString("en-US")}</p>
      <Link href={`/advertiser?product=${x.code}`} className="mt-5 inline-block rounded-xl bg-white px-5 py-3 font-bold text-slate-950">Create campaign →</Link>
    </article>)}</div>
    <p className="mt-10 max-w-3xl text-sm text-slate-400">Payment does not bypass content controls. Campaigns remain subject to automated safety checks and publication policy before activation. Pricing shown here is the configured launch inventory and can be revised centrally.</p>
  </section></main>
}
