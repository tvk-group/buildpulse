"use client";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function FounderChangesInner(){
 const q=useSearchParams();
 const token=q.get("token")??"";
 const [state,setState]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  const f=new FormData(e.currentTarget);
  const r=await fetch("/api/buildpulse/founder-review/changes",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token,directives:f.get("directives")})});
  setState(r.ok?"Your directives were recorded. This revision will not be distributed until a new revision is sent to you and approved.":"Could not record directives. The review link may be expired or for an older revision.");
 }
 return <main className="min-h-screen bg-slate-50 p-8 text-slate-950"><form onSubmit={submit} className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm"><p className="text-xs font-black tracking-[.18em] text-slate-500">TVK BUILDPULSE · FOUNDER CONTROL</p><h1 className="mt-3 text-3xl font-black">Request changes</h1><p className="mt-3 text-slate-600">Write the exact editorial directives. The current edition remains blocked from subscriber delivery.</p><textarea required name="directives" rows={12} className="mt-6 w-full rounded-xl border p-4" placeholder="Example: change the lead story, shorten the market section, correct…"/><button className="mt-4 rounded-xl bg-slate-950 px-6 py-3 font-bold text-white">Submit directives</button>{state&&<p className="mt-4">{state}</p>}</form></main>;
}

export default function FounderChanges(){return <Suspense fallback={<main className="min-h-screen bg-slate-50 p-8 text-slate-950"><section className="mx-auto max-w-3xl rounded-2xl bg-white p-8">Loading secure founder review…</section></main>}><FounderChangesInner/></Suspense>}
