import {createClient as createSupabaseClient} from "@supabase/supabase-js";
import {getSupabasePublicConfig} from "@/lib/supabase/env";

type Props={placement:"homepage"|"archive"|"edition_top"|"edition_inline"|"edition_footer"|"newsletter";className?:string};
type ActiveAd={order_id:string;headline:string|null;copy_text:string|null;product_id:string;width_px:number|null;height_px:number|null;has_creative:boolean};

export async function BuildPulseAdSlot({placement,className=""}:Props){
  const {url,key}=getSupabasePublicConfig();
  const db=createSupabaseClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.rpc("buildpulse_active_ad_for_placement",{p_placement:placement});
  const ad=((data??[]) as ActiveAd[])[0];
  if(error||!ad)return null;
  return <aside className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`} aria-label="Advertisement">
    <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Advertisement</span>{ad.width_px&&ad.height_px?<span className="text-[10px] text-slate-400">{ad.width_px} × {ad.height_px}</span>:null}</div>
    {ad.has_creative&&ad.width_px&&ad.height_px?<img src={`/api/buildpulse/ads/creative/${encodeURIComponent(ad.order_id)}`} alt={ad.headline||"Sponsor creative"} width={ad.width_px} height={ad.height_px} className="mt-3 h-auto w-full rounded-xl object-cover"/>:null}
    {ad.headline?<h3 className="mt-3 text-lg font-black">{ad.headline}</h3>:null}
    {ad.copy_text?<p className="mt-2 text-sm leading-6 text-slate-600">{ad.copy_text}</p>:null}
    <img alt="" aria-hidden="true" width="1" height="1" src={`/api/buildpulse/ads/impression?order=${encodeURIComponent(ad.order_id)}`} className="absolute h-px w-px opacity-0"/>
    <a className="mt-4 inline-flex font-bold underline" href={`/api/buildpulse/ads/click?order=${encodeURIComponent(ad.order_id)}`} rel="sponsored noopener noreferrer" target="_blank">Visit sponsor →</a>
  </aside>
}
