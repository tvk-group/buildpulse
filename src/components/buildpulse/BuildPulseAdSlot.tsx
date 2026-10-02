import {getSupabasePublicConfig} from "@/lib/supabase/env";

type Props={placement:"homepage"|"archive"|"edition_top"|"edition_inline"|"edition_footer"|"newsletter";className?:string};
type ActiveAd={orderId:string;headline:string|null;copyText:string|null;productId:string;widthPx:number|null;heightPx:number|null;hasCreative:boolean};

export async function BuildPulseAdSlot({placement,className=""}:Props){
  const {url,key,configured}=getSupabasePublicConfig();
  if(!configured)return null;
  const endpoint=new URL(`${url}/functions/v1/buildpulse-ad-runtime`);
  endpoint.searchParams.set("action","lookup");
  endpoint.searchParams.set("placement",placement);
  const response=await fetch(endpoint,{cache:"no-store",headers:{apikey:key}}).catch(()=>null);
  if(!response?.ok)return null;
  const body=await response.json() as {ok?:boolean;ad?:ActiveAd|null};
  const ad=body.ad;
  if(!body.ok||!ad)return null;
  return <aside className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`} aria-label="Advertisement">
    <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Advertisement</span>{ad.widthPx&&ad.heightPx?<span className="text-[10px] text-slate-400">{ad.widthPx} × {ad.heightPx}</span>:null}</div>
    {ad.hasCreative&&ad.widthPx&&ad.heightPx?<img src={`/api/buildpulse/ads/creative/${encodeURIComponent(ad.orderId)}`} alt={ad.headline||"Sponsor creative"} width={ad.widthPx} height={ad.heightPx} className="mt-3 h-auto w-full rounded-xl object-cover"/>:null}
    {ad.headline?<h3 className="mt-3 text-lg font-black">{ad.headline}</h3>:null}
    {ad.copyText?<p className="mt-2 text-sm leading-6 text-slate-600">{ad.copyText}</p>:null}
    <img alt="" aria-hidden="true" width="1" height="1" src={`/api/buildpulse/ads/impression?order=${encodeURIComponent(ad.orderId)}`} className="absolute h-px w-px opacity-0"/>
    <a className="mt-4 inline-flex font-bold underline" href={`/api/buildpulse/ads/click?order=${encodeURIComponent(ad.orderId)}`} rel="sponsored noopener noreferrer" target="_blank">Visit sponsor →</a>
  </aside>
}
