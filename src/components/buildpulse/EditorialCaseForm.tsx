"use client";
import {useState} from "react";
import type {FormEvent} from "react";

export function EditorialCaseForm({initialTargetUrl=""}:{initialTargetUrl?:string}={}){
 const [state,setState]=useState<"idle"|"sending"|"done"|"error">("idle"),[message,setMessage]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setState("sending");setMessage("");
  const fd=new FormData(e.currentTarget);
  const payload={type:fd.get("type"),targetUrl:fd.get("targetUrl"),email:fd.get("email"),summary:fd.get("summary"),evidence:fd.get("evidence")};
  const res=await fetch("/api/editorial/cases",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
  const body=await res.json().catch(()=>({}));
  if(res.ok){setState("done");setMessage("Your request has been recorded for newsroom review.");e.currentTarget.reset()}else{setState("error");setMessage(body.error==="rate_limited"?"Too many recent submissions. Please try again later.":"Please check the required fields and try again.")}
 }
 return <form onSubmit={submit} className="mt-8 grid gap-5 rounded-3xl border border-black/15 bg-white p-6 md:p-8"><label className="grid gap-2 text-sm font-bold">Request type<select name="type" required className="rounded-xl border px-3 py-3 font-normal"><option value="correction">Correction</option><option value="complaint">Complaint</option><option value="takedown">Takedown request</option></select></label><label className="grid gap-2 text-sm font-bold">BuildPulse article/page URL<input name="targetUrl" type="url" required defaultValue={initialTargetUrl} placeholder="https://www.buildpulse.news/..." className="rounded-xl border px-3 py-3 font-normal"/></label><label className="grid gap-2 text-sm font-bold">Contact email<input name="email" type="email" required className="rounded-xl border px-3 py-3 font-normal"/></label><label className="grid gap-2 text-sm font-bold">What should the newsroom review?<textarea name="summary" required minLength={20} maxLength={4000} rows={7} className="rounded-xl border px-3 py-3 font-normal"/></label><label className="grid gap-2 text-sm font-bold">Evidence or supporting context <span className="font-normal text-slate-500">(optional)</span><textarea name="evidence" maxLength={8000} rows={5} className="rounded-xl border px-3 py-3 font-normal"/></label><button disabled={state==="sending"} className="rounded-xl bg-black px-5 py-3 font-black text-white disabled:opacity-50">{state==="sending"?"Submitting…":"Submit for newsroom review"}</button>{message&&<p role="status" className={state==="error"?"text-sm font-bold text-red-700":"text-sm font-bold text-[#0b6b63]"}>{message}</p>}</form>
}
