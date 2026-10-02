import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import EditionBuildActions from "@/components/buildpulse/EditionBuildActions";
import EditionControlActions from "@/components/buildpulse/EditionControlActions";

export const dynamic="force-dynamic";
export const metadata={title:"BuildPulse Edition Control",description:"Generate, review, approve and schedule BuildPulse editions."};

type Edition={id:string;edition_type:string;subject:string;preheader:string|null;slug:string;status:string;body_html:string|null;revision_number:number;founder_review_status:string;founder_review_notes:string|null;founder_approved_revision:number|null;scheduled_at:string|null;published_at:string|null;created_at:string;updated_at:string;generation_error:string|null};

export default async function EditionAdmin(){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/advertiser");
 const {data,error}=await supabase.functions.invoke("buildpulse-edition-admin",{body:{action:"list"}});
 if(!error&&data?.error==="admin_required")redirect("/");
 const editions=(Array.isArray(data?.editions)?data.editions:[]) as Edition[];
 return <main className="min-h-screen bg-slate-100 text-slate-950"><div className="mx-auto max-w-6xl px-6 py-12">
   <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black tracking-[.2em] text-slate-500">BUILD PULSE // EDITION CONTROL</p><h1 className="mt-3 text-4xl font-black">Generate, review & schedule editions</h1><p className="mt-3 max-w-3xl text-slate-600">Only verified stories with review provenance are eligible. Scheduling requires explicit approval of the current revision.</p></div><div className="flex gap-4"><Link className="font-bold underline" href="/admin/stories">Story review</Link><Link className="font-bold underline" href="/admin/advertising">Advertising control</Link></div></div>
   <div className="mt-8 rounded-2xl border bg-white p-5"><EditionBuildActions/></div>
   {error||!data?.ok?<p className="mt-6 rounded-xl bg-red-50 p-4 text-red-800">Edition control could not be loaded.</p>:null}
   <div className="mt-6 grid gap-6">{editions.map(e=>{const html=e.body_html??"";return <article key={e.id} className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wider text-slate-500">{e.edition_type} · {e.slug}</p><h2 className="mt-2 text-2xl font-black">{e.subject}</h2><p className="mt-1 text-sm text-slate-500">{e.preheader}</p></div><div className="text-right"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase">{e.status}</span><p className="mt-2 text-xs text-slate-500">Revision {e.revision_number} · approval {e.founder_review_status}</p></div></div>
        {e.generation_error?<p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{e.generation_error}</p>:null}
        {html?<iframe title={`Preview ${e.subject}`} sandbox="" srcDoc={html} className="mt-5 h-[560px] w-full rounded-xl border bg-white"/>:<p className="mt-5 text-sm text-slate-500">No composed HTML yet.</p>}
        <EditionControlActions edition={e}/>
      </article>})}{!error&&data?.ok&&!editions.length?<div className="rounded-2xl border bg-white p-8 text-slate-600">No editions have been generated yet. Verify stories first, then build Daily or Weekly.</div>:null}</div>
 </div></main>
}
