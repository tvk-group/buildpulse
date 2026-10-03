"use client";
import { FormEvent,useEffect,useState } from "react";
import { usePathname } from "next/navigation";
const DISMISSED="buildpulse_prompt_dismissed_v1", SUBSCRIBED="buildpulse_prompt_subscribed_v1";
export function BuildPulseOptInPrompt(){
 const path=usePathname()??""; const [open,setOpen]=useState(false); const [state,setState]=useState<"idle"|"sending"|"ok"|"error">("idle");
 useEffect(()=>{if(/\/(auth|dashboard|apply|onboarding|admin|payment|payments|kyc|wallet|unsubscribe)(\/|$)/i.test(path))return;try{if(localStorage.getItem(DISMISSED)||localStorage.getItem(SUBSCRIBED))return;}catch{}const t=setTimeout(()=>{setOpen(true);fetch("/api/buildpulse/events",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"invite_shown",surface:"ecosystem_prompt",product:"buildpulse",path})}).catch(()=>{})},12000);return()=>clearTimeout(t)},[path]);
 function dismiss(){try{localStorage.setItem(DISMISSED,new Date().toISOString())}catch{}fetch("/api/buildpulse/events",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"invite_dismissed",surface:"ecosystem_prompt",product:"buildpulse",path})}).catch(()=>{});setOpen(false)}
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setState("sending");const fd=new FormData(e.currentTarget);const r=await fetch("/api/buildpulse/subscribe",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:fd.get("email"),locale:document.documentElement.lang||"en",cadence:"weekly",topics:["ai","blockchain","crypto","security","digital-economy"],consent:true,consentSource:"ecosystem_prompt",surface:"ecosystem_prompt",product:"buildpulse",path})});if(r.ok){try{localStorage.setItem(SUBSCRIBED,new Date().toISOString())}catch{}setState("ok");setTimeout(()=>setOpen(false),1600)}else setState("error")}
 if(!open)return null;
 return <aside role="dialog" aria-modal="false" aria-label="BuildPulse email invitation" className="fixed bottom-5 left-1/2 z-[90] w-[min(94vw,620px)] -translate-x-1/2 rounded-2xl border border-slate-300 bg-white p-5 text-slate-950 shadow-2xl">
  <button onClick={dismiss} aria-label="Dismiss BuildPulse invitation" className="absolute right-4 top-3 text-2xl text-slate-500">×</button>
  <p className="text-xs font-black tracking-[.18em] text-slate-500">TVK BUILDPULSE</p><h2 className="mt-2 pr-8 text-xl font-black">Would you like the BuildPulse intelligence briefing by email?</h2>
  <p className="mt-2 text-sm leading-6 text-slate-600">AI, blockchain, digital assets, security and digital-economy developments. Optional — using the ecosystem does not subscribe you automatically.</p>
  <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row"><input required name="email" type="email" autoComplete="email" placeholder="Email address" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3"/><button disabled={state==="sending"} className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-50">{state==="sending"?"Joining…":"Yes, send BuildPulse"}</button></form>
  <p className="mt-2 text-xs leading-5 text-slate-500">By choosing “Yes”, you explicitly request BuildPulse marketing/intelligence emails. You can unsubscribe at any time.</p>
  {state==="ok"&&<p className="mt-2 text-sm font-semibold">You’re subscribed.</p>}{state==="error"&&<p className="mt-2 text-sm font-semibold">We could not save the subscription. Please try again.</p>}
 </aside>
}
