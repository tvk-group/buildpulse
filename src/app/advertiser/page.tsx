import { Suspense } from "react";
import Link from "next/link";
import { BuildPulseAdvertiserPortal } from "@/components/buildpulse/BuildPulseAdvertiserPortal";

export const metadata={title:"BuildPulse Advertiser Portal",description:"Create and manage BuildPulse advertising campaigns."};

export default function BuildPulseAdvertiserPage(){
 return <main className="min-h-screen bg-slate-50 text-slate-950"><section className="mx-auto max-w-5xl px-6 py-16"><p className="text-xs font-black tracking-[.2em] text-slate-500">BUILDPULSE // ADVERTISER PORTAL</p><h1 className="mt-4 text-5xl font-black">Campaign control.</h1><p className="mt-5 max-w-3xl leading-7 text-slate-600">Create your advertiser identity, select inventory and prepare campaign drafts. Commercial content is reviewed separately from editorial coverage; payment does not guarantee publication.</p><div className="mt-5"><Link href="/advertise" className="font-bold underline">View inventory and pricing →</Link></div><div className="mt-10"><Suspense fallback={<div className="rounded-3xl border bg-white p-7">Loading advertiser portal…</div>}><BuildPulseAdvertiserPortal/></Suspense></div></section></main>
}
