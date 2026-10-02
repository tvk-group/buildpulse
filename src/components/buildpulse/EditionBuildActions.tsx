"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/utils/supabase/client";
export default function EditionBuildActions(){
 const supabase=createClient(),router=useRouter();const [busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 async function build(type:"daily"|"weekly"){setBusy(true);setMsg("");const {data,error}=await supabase.functions.invoke("buildpulse-edition-admin",{body:{action:"build",type}});setMsg(error?.message??data?.error??(data?.skipped?`Skipped: ${data.reason}`:`Built ${type} edition with ${data?.storyCount??0} stories.`));setBusy(false);if(!error&&data?.ok)router.refresh()}
 return <div className="flex flex-wrap items-center gap-3"><button disabled={busy} onClick={()=>void build("daily")} className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white">Build Daily</button><button disabled={busy} onClick={()=>void build("weekly")} className="rounded-xl border px-5 py-3 font-bold">Build Weekly</button>{msg?<span className="text-sm text-slate-600">{msg}</span>:null}</div>
}
