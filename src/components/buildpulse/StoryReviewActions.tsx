"use client";
import {useState} from "react";

export default function StoryReviewActions({id,canonicalUrl}:{id:string;canonicalUrl:string}){
 const [notes,setNotes]=useState(""),[evidence,setEvidence]=useState(""),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 async function act(action:"verify"|"reject"){
  const evidenceUrls=evidence.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(notes.trim().length<3){setMsg("Add review notes before finalizing.");return}
  if(evidenceUrls.length>20){setMsg("Use at most 20 supporting evidence URLs.");return}
  if(evidenceUrls.some(value=>{try{return new URL(value).protocol!=="https:"}catch{return true}})){setMsg("Supporting evidence must use valid HTTPS URLs.");return}
  setBusy(true);setMsg("");
  const body={storyId:id,action,notes:notes.trim(),canonicalSourceUrl:canonicalUrl,evidence:evidenceUrls.map(url=>({url,kind:"supporting" as const}))};
  const r=await fetch("/api/admin/buildpulse/stories/review",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}),j=await r.json().catch(()=>({}));
  setMsg(r.ok?`${action} saved`:j.error||"Review failed");setBusy(false);if(r.ok)location.reload();
 }
 const disabled=busy||notes.trim().length<3;
 return <div className="mt-4"><textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Review notes / rejection reason" className="min-h-24 w-full rounded-xl border p-3 text-sm"/><textarea value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder={"Optional supporting evidence URLs — one HTTPS URL per line"} className="mt-2 min-h-20 w-full rounded-xl border p-3 text-sm"/><p className="mt-1 text-xs text-slate-500">The canonical source is always recorded as primary evidence. Up to 20 additional HTTPS URLs may be stored as supporting evidence.</p><div className="mt-3 flex gap-2"><button disabled={disabled} onClick={()=>act("verify")} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Verify</button><button disabled={disabled} onClick={()=>act("reject")} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Reject</button></div>{msg?<p className="mt-2 text-sm">{msg}</p>:null}</div>
}
