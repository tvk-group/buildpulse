"use client";
import { FormEvent,useState } from "react";
export function BuildPulseSubscribe(){
 const [state,setState]=useState<"idle"|"sending"|"ok"|"error">("idle");
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setState("sending");const fd=new FormData(e.currentTarget);const r=await fetch("/api/buildpulse/subscribe",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:fd.get("email"),locale:"en",cadence:fd.get("cadence"),topics:["ai","blockchain","crypto","security","digital-economy","entelekron"],consent:true})});setState(r.ok?"ok":"error");}
 return <form onSubmit={submit} className="mt-8 grid w-full gap-3 rounded-xl border border-white/25 bg-white p-5 text-[#17202a] shadow-sm md:grid-cols-[minmax(0,1fr)_auto_auto]">
  <input required name="email" type="email" autoComplete="email" placeholder="you@example.com" className="min-w-0 rounded-lg border border-[#c8d1cf] bg-[#fbfaf6] px-4 py-3 text-base outline-none transition focus:border-[#0b6b63] focus:ring-2 focus:ring-[#0b6b63]/20"/>
  <select name="cadence" defaultValue="weekly" className="min-w-0 rounded-lg border border-[#c8d1cf] bg-[#fbfaf6] px-4 py-3 text-base outline-none transition focus:border-[#0b6b63] focus:ring-2 focus:ring-[#0b6b63]/20"><option value="weekly">Weekly</option><option value="daily">Daily</option><option value="both">Daily + Weekly</option></select>
  <button disabled={state==="sending"} className="rounded-lg bg-[#0b6b63] px-5 py-3 font-bold text-white transition hover:bg-[#08574f] disabled:opacity-50">{state==="sending"?"Joining…":"Subscribe"}</button>
  <label className="text-sm leading-5 text-[#53606b] md:col-span-3"><input required type="checkbox" className="mr-2"/>I want BuildPulse intelligence emails and understand I can unsubscribe at any time.</label>
  {state==="ok"&&<p className="text-sm font-semibold md:col-span-3">Subscription saved.</p>}{state==="error"&&<p className="text-sm font-semibold md:col-span-3">Subscription could not be completed.</p>}
 </form>
}
