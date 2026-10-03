"use client";
import {FormEvent,useState} from "react";
import {getBuildPulseLocale,getDeviceTimeZone} from "@/lib/buildpulse/localization";
export function BuildPulseSubscribe(){
 const [state,setState]=useState<"idle"|"sending"|"ok"|"error">("idle");
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setState("sending");const fd=new FormData(e.currentTarget);try{const r=await fetch("/api/buildpulse/subscribe",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:fd.get("email"),locale:getBuildPulseLocale(),timeZone:getDeviceTimeZone(),cadence:fd.get("cadence"),topics:["ai","blockchain","crypto","security","digital-economy","entelekron"],consent:fd.get("consent")==="yes"})});setState(r.ok?"ok":"error")}catch{setState("error")}}
 return <form onSubmit={submit} className="mt-8 w-full rounded-xl border border-white/30 bg-white p-5 text-[#17202a] shadow-sm">
  <p className="mb-4 text-sm leading-5 text-[#53606b]">Get BuildPulse intelligence in your inbox. Enter your email, choose delivery frequency and confirm consent below.</p>
  <div className="grid gap-3">
   <label htmlFor="buildpulse-subscribe-email" className="text-xs font-black uppercase tracking-[.12em] text-[#42505a]">Email address</label>
   <input id="buildpulse-subscribe-email" required name="email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" aria-describedby="buildpulse-subscribe-help" className="block h-12 w-full appearance-none rounded-lg border-2 border-[#81908d] bg-white px-4 text-base text-[#17202a] placeholder:text-[#7a858b] outline-none focus:border-[#0b6b63] focus:ring-2 focus:ring-[#0b6b63]/20"/>
   <p id="buildpulse-subscribe-help" className="text-xs text-[#65717c]">We use this address only for the BuildPulse briefings you request.</p>
   <label htmlFor="buildpulse-subscribe-cadence" className="mt-1 text-xs font-black uppercase tracking-[.12em] text-[#42505a]">Delivery</label>
   <select id="buildpulse-subscribe-cadence" name="cadence" defaultValue="weekly" className="block h-12 w-full rounded-lg border-2 border-[#81908d] bg-white px-4 text-base outline-none focus:border-[#0b6b63] focus:ring-2 focus:ring-[#0b6b63]/20"><option value="weekly">Weekly briefing</option><option value="daily">Daily briefing</option><option value="both">Daily + Weekly</option></select>
   <label className="mt-2 flex items-start gap-3 rounded-lg bg-[#f2f5f3] p-3 text-sm leading-5 text-[#42505a]"><input required name="consent" value="yes" type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[#0b6b63]"/><span>I want BuildPulse intelligence emails and understand that I can unsubscribe at any time.</span></label>
   <button disabled={state==="sending"} className="mt-1 h-12 w-full rounded-lg bg-[#0b6b63] px-5 font-black text-white transition hover:bg-[#08574f] disabled:opacity-50">{state==="sending"?"Subscribing…":"Subscribe to BuildPulse"}</button>
   <div aria-live="polite">{state==="ok"&&<p className="text-sm font-semibold text-[#0b6b63]">Subscription saved. Welcome to BuildPulse.</p>}{state==="error"&&<p className="text-sm font-semibold text-[#9b2c2c]">Subscription could not be completed. Please check your email and try again.</p>}</div>
  </div>
 </form>
}