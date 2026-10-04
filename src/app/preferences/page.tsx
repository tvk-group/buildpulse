import type {Metadata} from "next";
import {Suspense} from "react";
import {BuildPulsePreferences} from "@/components/buildpulse/BuildPulsePreferences";

export const metadata:Metadata={
  title:"Email preferences | BuildPulse",
  description:"Manage signed BuildPulse email delivery preferences.",
  robots:{index:false,follow:false},
  alternates:{canonical:"https://www.buildpulse.news/preferences"}
};

export default function PreferencesPage(){
  return <main className="mx-auto min-h-[70vh] max-w-3xl px-4 py-12 sm:px-6">
    <p className="text-xs font-black uppercase tracking-[.18em] text-[#0b6b63]">BuildPulse delivery</p>
    <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Email preferences</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Use the signed link from a BuildPulse email to update delivery cadence, topics, language and time zone, or to unsubscribe. Preference changes require a valid signed token.</p>
    <div className="mt-7"><Suspense fallback={<div className="rounded-2xl border bg-white p-6 text-slate-600">Loading signed preferences…</div>}><BuildPulsePreferences/></Suspense></div>
  </main>
}
