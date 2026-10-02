import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import AdvertisingReviewActions from "@/components/buildpulse/AdvertisingReviewActions";

export const dynamic="force-dynamic";
export const metadata={title:"BuildPulse Advertising Control",description:"Review and schedule BuildPulse advertising."};

type Creative={id:string;mimeType:string;byteSize:number;widthPx:number|null;heightPx:number|null;sha256:string;reviewState:string;reviewNotes:string|null;createdAt:string};
type QueueItem={id:string;status:string;headline:string|null;copyText:string|null;destinationUrl:string;amountUsd:number|string;createdAt:string;startsAt:string|null;endsAt:string|null;reviewNotes:string|null;paymentState:string|null;product:{code:string;name:string;placement:string;widthPx:number|null;heightPx:number|null;durationDays:number};advertiser:{companyName:string|null;billingEmail:string|null;websiteUrl:string|null};creatives:Creative[]};

export default async function AdvertisingAdmin(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/advertiser");
  const {data,error}=await supabase.functions.invoke("buildpulse-ad-admin",{body:{action:"queue"}});
  if(error||!data?.ok){
    if(String(data?.error??"").includes("admin_required"))redirect("/");
  }
  const queue=(Array.isArray(data?.queue)?data.queue:[]) as QueueItem[];
  return <main className="min-h-screen bg-slate-100 text-slate-950"><div className="mx-auto max-w-6xl px-6 py-12">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black tracking-[.2em] text-slate-500">BUILD PULSE // COMMERCIAL CONTROL</p><h1 className="mt-3 text-4xl font-black">Advertising review & scheduling</h1><p className="mt-3 text-slate-600">Role-gated review queue. Payment confirmation never bypasses creative or publication review.</p></div><div className="flex gap-4"><Link className="font-bold underline" href="/admin/stories">Editorial review</Link><Link className="font-bold underline" href="/status">Launch control</Link></div></div>
    {error||!data?.ok?<p className="mt-8 rounded-xl bg-red-50 p-4 text-red-800">Advertising queue could not be loaded.</p>:null}
    <div className="mt-8 grid gap-6">{queue.map(item=><article key={item.id} className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wider text-slate-500">{item.product.name} · {item.product.placement.replaceAll("_"," ")}</p><h2 className="mt-2 text-2xl font-black">{item.headline||"Untitled campaign"}</h2></div><div className="text-right"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase">{item.status}</span><p className="mt-2 text-sm font-bold">USD {Number(item.amountUsd).toLocaleString("en-US")}</p><p className="text-xs text-slate-500">Payment: {item.paymentState||"none"}</p></div></div>
      <p className="mt-4 leading-7 text-slate-600">{item.copyText}</p>
      <a href={item.destinationUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block break-all text-sm font-bold underline">Open sponsor destination ↗</a>
      <div className="mt-4 grid gap-2 text-xs text-slate-500 md:grid-cols-2"><p>Advertiser: {item.advertiser.companyName||"—"} · {item.advertiser.billingEmail||"—"}</p><p>Created: {new Date(item.createdAt).toLocaleString()}</p>{item.startsAt?<p>Starts: {new Date(item.startsAt).toLocaleString()}</p>:null}{item.endsAt?<p>Ends: {new Date(item.endsAt).toLocaleString()}</p>:null}</div>
      <AdvertisingReviewActions orderId={item.id} status={item.status} creatives={item.creatives??[]} durationDays={item.product.durationDays}/>
    </article>)}
    {!error&&data?.ok&&!queue.length?<div className="rounded-2xl border bg-white p-8 text-slate-600">No paid campaigns are awaiting commercial review.</div>:null}</div>
  </div></main>
}
