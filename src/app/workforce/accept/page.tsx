"use client";
import {Suspense,useState} from "react";
import {useSearchParams,useRouter} from "next/navigation";

function AcceptWorkforceInvite(){
 const q=useSearchParams(),r=useRouter(),token=q.get("token")||"";
 const [state,setState]=useState("Ready to accept your BuildPulse workforce invitation."),[busy,setBusy]=useState(false);
 async function accept(){setBusy(true);try{const x=await fetch("/api/workforce/access/accept",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token})});const j=await x.json();if(!x.ok){setState(j.error||"Invitation could not be accepted.");return}setState("Invitation accepted. Strong authentication is required.");r.push(j.next||"/auth/mfa?next=/workforce")}finally{setBusy(false)}}
 return <main className="mx-auto max-w-xl px-5 py-16"><p className="text-xs font-black uppercase tracking-[.18em] text-[#0b6b63]">BuildPulse Workforce</p><h1 className="mt-3 text-4xl font-black">Accept invitation</h1><p className="mt-4 leading-7 text-slate-600">{state}</p><div className="mt-8 rounded-2xl border bg-white p-6"><p className="text-sm text-slate-600">You must be signed in with the exact email address that received this invitation. Workforce access requires MFA and is role-scoped.</p><button disabled={busy||token.length<20} onClick={accept} className="mt-5 rounded-xl bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-40">{busy?"Accepting…":"Accept invitation"}</button></div></main>
}
export default function WorkforceAccept(){return <Suspense fallback={<main className="mx-auto max-w-xl px-5 py-16 text-sm text-slate-600">Loading secure invitation…</main>}><AcceptWorkforceInvite/></Suspense>}
