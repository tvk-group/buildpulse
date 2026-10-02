"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
function FounderApproveInner(){
 const q=useSearchParams(),token=q.get("token")??"";const[state,setState]=useState<"idle"|"working"|"approved"|"error">("idle");
 async function approve(){setState("working");const r=await fetch("/api/buildpulse/founder-review/approve",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token})});setState(r.ok?"approved":"error")}
 return <main className="min-h-screen bg-slate-50 p-8 text-slate-950"><section className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm"><p className="text-xs font-black tracking-[.18em] text-slate-500">TVK BUILDPULSE · FOUNDER CONTROL</p><h1 className="mt-3 text-3xl font-black">Confirm newsletter approval</h1><p className="mt-4 text-slate-600">Opening the email link does not approve or distribute anything. Press the button below only after you have reviewed the exact revision sent to you.</p>{state==="approved"?<p className="mt-6 rounded-xl bg-emerald-50 p-4 font-bold text-emerald-900">Approved. This exact revision is now eligible for the delivery dispatcher.</p>:<button disabled={!token||state==="working"} onClick={approve} className="mt-6 rounded-xl bg-slate-950 px-6 py-3 font-bold text-white disabled:opacity-50">{state==="working"?"Recording approval…":"Approve this exact revision"}</button>}{state==="error"&&<p className="mt-4 text-red-700">Approval was not recorded. The link may be expired or belong to an older revision.</p>}</section></main>;
}

export default function FounderApprove(){return <Suspense fallback={<main className="min-h-screen bg-slate-50 p-8 text-slate-950"><section className="mx-auto max-w-2xl rounded-2xl bg-white p-8">Loading secure founder review…</section></main>}><FounderApproveInner/></Suspense>}
