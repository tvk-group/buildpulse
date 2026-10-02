"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/utils/supabase/client";

type Edition={id:string;edition_type:string;subject:string;status:string;revision_number:number;founder_review_status:string;founder_review_notes:string|null;scheduled_at:string|null};
export default function EditionControlActions({edition}:{edition:Edition}){
 const supabase=createClient(),router=useRouter();
 const [busy,setBusy]=useState(false),[msg,setMsg]=useState(""),[notes,setNotes]=useState(""),[scheduledAt,setScheduledAt]=useState("");
 async function call(body:Record<string,unknown>){
   setBusy(true);setMsg("");
   const {data,error}=await supabase.functions.invoke("buildpulse-edition-admin",{body});
   setMsg(error?.message??data?.error??(data?.state?`Edition ${data.state}.`:data?.reason??"Saved."));
   setBusy(false);if(!error&&data?.ok)router.refresh();
 }
 return <div className="mt-5 border-t pt-5">
   {edition.status==="review"?<div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>void call({action:"edition",editionId:edition.id,editionAction:"approve"})} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Approve revision {edition.revision_number}</button></div>:null}
   {edition.status==="review"?<div className="mt-3 flex flex-col gap-2 sm:flex-row"><textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Change directives" className="min-h-20 flex-1 rounded-lg border p-3 text-sm"/><button disabled={busy||notes.trim().length<3} onClick={()=>void call({action:"edition",editionId:edition.id,editionAction:"changes",notes})} className="rounded-lg border border-amber-400 px-4 py-2 text-sm font-bold text-amber-800">Request changes</button></div>:null}
   {edition.status==="approved"?<div className="mt-3 flex flex-wrap items-end gap-3"><label className="text-xs font-bold text-slate-600">Delivery schedule<input type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} className="mt-1 block rounded-lg border px-3 py-2 text-sm font-normal text-slate-950"/></label><button disabled={busy||!scheduledAt} onClick={()=>void call({action:"edition",editionId:edition.id,editionAction:"schedule",scheduledAt:new Date(scheduledAt).toISOString()})} className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-bold text-white">Schedule delivery</button></div>:null}
   {msg?<p className="mt-3 text-xs text-slate-600">{msg}</p>:null}
 </div>
}
