"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/utils/supabase/client";

type Creative={id:string;mimeType:string;byteSize:number;widthPx:number|null;heightPx:number|null;sha256:string;reviewState:string;reviewNotes:string|null;createdAt:string};
type Props={orderId:string;status:string;creatives:Creative[];durationDays:number};

export default function AdvertisingReviewActions({orderId,status,creatives,durationDays}:Props){
  const supabase=createClient(),router=useRouter();
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[startsAt,setStartsAt]=useState("");

  async function creativeAction(creativeId:string,decision:"approved"|"rejected"){
    setBusy(true);setMessage("");
    const {data,error}=await supabase.rpc("buildpulse_admin_review_creative",{p_creative_id:creativeId,p_decision:decision,p_notes:null});
    setMessage(error?.message??(data?.state?`Creative ${data.state}.`:"Creative review saved."));
    setBusy(false);if(!error)router.refresh();
  }
  async function orderAction(action:"approve"|"reject"|"schedule"){
    setBusy(true);setMessage("");
    const start=action==="schedule"&&startsAt?new Date(startsAt).toISOString():null;
    if(action==="schedule"&&!start){setMessage("Choose a schedule start time.");setBusy(false);return}
    const {data,error}=await supabase.rpc("buildpulse_admin_order_action",{p_order_id:orderId,p_action:action,p_starts_at:start,p_notes:null});
    setMessage(error?.message??(data?.state?`Order ${data.state}.`:"Order updated."));
    setBusy(false);if(!error)router.refresh();
  }
  return <div className="mt-5 border-t pt-5">
    <div className="grid gap-4">
      {creatives.map(c=><div key={c.id} className="rounded-xl border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-black uppercase">{c.reviewState}</span><span className="text-xs text-slate-500">{c.widthPx??"?"} × {c.heightPx??"?"} · {Math.ceil(c.byteSize/1024)} KB</span></div>
        <img src={`/api/admin/buildpulse/advertising/creative/${c.id}`} alt="Advertiser creative for review" className="mt-3 max-h-80 w-auto max-w-full rounded-lg border object-contain"/>
        <div className="mt-3 flex gap-2"><button disabled={busy} onClick={()=>void creativeAction(c.id,"approved")} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Approve creative</button><button disabled={busy} onClick={()=>void creativeAction(c.id,"rejected")} className="rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white">Reject creative</button></div>
      </div>)}
      {!creatives.length?<p className="text-sm text-slate-500">No creative uploaded.</p>:null}
    </div>
    <div className="mt-5 flex flex-wrap items-end gap-3">
      {["payment_detected","review"].includes(status)?<button disabled={busy} onClick={()=>void orderAction("approve")} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white">Approve order</button>:null}
      {["payment_detected","review","approved","scheduled"].includes(status)?<button disabled={busy} onClick={()=>void orderAction("reject")} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-bold text-red-700">Reject order</button>:null}
      {status==="approved"?<><label className="text-xs font-bold text-slate-600">Start time<input type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} className="mt-1 block rounded-lg border px-3 py-2 text-sm font-normal text-slate-950"/></label><button disabled={busy} onClick={()=>void orderAction("schedule")} className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-bold text-white">Schedule {durationDays}d</button></>:null}
    </div>
    {message?<p className="mt-3 text-xs text-slate-600">{message}</p>:null}
  </div>
}
