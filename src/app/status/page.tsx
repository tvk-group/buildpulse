import Link from "next/link";
import {getSupabasePublicConfig} from "@/lib/supabase/env";

export const dynamic="force-dynamic";
type StatusData={
  ok:boolean;
  counts:{enabledSources:number;healthySources:number;stories:number;verifiedStories:number;pendingStories:number;activeSubscribers:number;editions:number;publishedEditions:number;sentEditions:number;scheduledOrActiveAds:number;stripePaymentLinks:number};
  checks:{database:boolean;sourceHealth:boolean;ingestionFresh:boolean;editorialControl:boolean;editionControl:boolean;webPublication:boolean;advertisingControl:boolean;stripeInventory:boolean;mailDomainVerified:boolean;editorialInventory:boolean;audienceInventory:boolean};
  mail:{provider:string;domain:string;domainStatus:string;deliveryEnabled:boolean};
  scheduler:{ingestion?:{status:string;started_at:string;finished_at:string|null;error:string|null}|null;webPublication:string;adActivation:string};
};

export default async function Status(){
  const {url,key}=getSupabasePublicConfig();
  const endpoint=new URL(url+"/functions/v1/buildpulse-status-runtime");
  const response=await fetch(endpoint,{cache:"no-store",headers:{apikey:key}}).catch(()=>null);
  const data=(response?.ok?await response.json().catch(()=>null):null) as StatusData|null;
  const c=data?.counts??{enabledSources:0,healthySources:0,stories:0,verifiedStories:0,pendingStories:0,activeSubscribers:0,editions:0,publishedEditions:0,sentEditions:0,scheduledOrActiveAds:0,stripePaymentLinks:0};
  const checks=data?.checks??{} as StatusData["checks"];
  const webReady=Boolean(checks.database&&checks.sourceHealth&&checks.ingestionFresh&&checks.editorialControl&&checks.editionControl&&checks.webPublication);
  const emailReady=Boolean(checks.mailDomainVerified&&checks.audienceInventory);
  const adReady=Boolean(checks.stripeInventory&&checks.advertisingControl);
  const ingest=data?.scheduler?.ingestion;
  const stages:[string,string][]=[
    ["Database & public runtime",checks.database?"Ready":"Unavailable"],
    ["Primary source ingestion",checks.sourceHealth&&checks.ingestionFresh?"Ready":"Attention required"],
    ["Source feeds",String(c.healthySources)+"/"+String(c.enabledSources)+" healthy"],
    ["Ingested stories",String(c.stories)],
    ["Awaiting editorial review",String(c.pendingStories)],
    ["Verified stories",String(c.verifiedStories)],
    ["Editorial control",checks.editorialControl?"Ready":"Unavailable"],
    ["Edition generation & approval",checks.editionControl?"Ready":"Unavailable"],
    ["Published web editions",String(c.publishedEditions)],
    ["Web publication pipeline",webReady?"Ready":"Gated"],
    ["Stripe advertising inventory",String(c.stripePaymentLinks)+"/7 live links"],
    ["Advertising / payment control",adReady?"Ready":"Gated"],
    ["Active subscribers",String(c.activeSubscribers)],
    ["Email sending domain",data?.mail?data.mail.domain+" · "+data.mail.domainStatus:"Unavailable"],
    ["Email delivery",emailReady?"Ready":"Gated by domain verification"]
  ];
  return <main className="min-h-screen bg-slate-950 text-white"><div className="mx-auto max-w-5xl px-6 py-16">
    <div className="flex flex-wrap items-center justify-between gap-4"><Link href="/" className="text-sm font-bold text-slate-300">← BuildPulse</Link><div className="flex flex-wrap gap-4 text-sm font-bold"><Link href="/admin/stories" className="underline">Story review</Link><Link href="/admin/editions" className="underline">Edition control</Link><Link href="/admin/advertising" className="underline">Advertising control</Link></div></div>
    <p className="mt-12 text-xs font-black tracking-[.2em] text-slate-400">BUILD PULSE // LAUNCH CONTROL</p>
    <h1 className="mt-4 text-5xl font-black">Publication progress</h1>
    <p className="mt-5 max-w-3xl leading-7 text-slate-300">Live system state from the production database and Edge control plane. Web publication, advertising and email delivery are tracked separately so external mail verification cannot mask healthy platform components.</p>
    <div className="mt-10 grid gap-4 md:grid-cols-2">{stages.map(([name,value])=><div key={name} className="rounded-2xl border border-slate-700 bg-slate-900 p-6"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">{name}</p><p className="mt-2 text-2xl font-black">{value}</p></div>)}</div>
    <section className="mt-10 rounded-2xl border border-slate-700 bg-slate-900 p-6"><p className="text-xs font-black uppercase tracking-widest text-slate-400">Schedulers</p><div className="mt-5 grid gap-3">
      <div className="flex flex-col justify-between gap-2 border-b border-slate-800 pb-3 md:flex-row"><span className="font-bold">Ingestion</span><span className={ingest?.status==="ok"?"text-emerald-300":"text-slate-400"}>{ingest?(ingest.status+" · "+new Date(ingest.started_at).toLocaleString("en-GB",{timeZone:"UTC"})+" UTC"):"Awaiting recorded run"}</span></div>
      <div className="flex flex-col justify-between gap-2 border-b border-slate-800 pb-3 md:flex-row"><span className="font-bold">Web publication</span><span className="text-emerald-300">{data?.scheduler?.webPublication??"database cron"}</span></div>
      <div className="flex flex-col justify-between gap-2 md:flex-row"><span className="font-bold">Ad activation</span><span className="text-emerald-300">{data?.scheduler?.adActivation??"database cron"}</span></div>
    </div></section>
    <p className="mt-10 rounded-2xl border border-slate-700 p-6 text-sm leading-6 text-slate-300">Current production flow: source ingestion → authenticated evidence review → edition generation → authenticated current-revision approval → scheduled web publication → public archive. Email delivery is a separate gated rail and will stay off until the dedicated BuildPulse sending domain verifies.</p>
  </div></main>
}
