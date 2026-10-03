import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requireBuildPulseAdmin} from "@/lib/buildpulse/admin-auth";
import {createAdminClient} from "@/lib/supabase/admin";

export const metadata={title:"Editorial Cases | BuildPulse",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";

async function decide(formData:FormData){
 "use server";
 const auth=await requireBuildPulseAdmin();
 if(!auth.ok)redirect((auth as any).mfaRequired?"/auth/mfa?next=/admin/editorial-cases":"/auth?next=/admin/editorial-cases");
 const id=String(formData.get("id")||""),status=String(formData.get("status")||""),resolution=String(formData.get("resolution")||"").trim();
 if(!["triage","investigating","resolved","rejected"].includes(status)||!id)return;
 const db=createAdminClient();if(!db)throw new Error("Editorial case service unavailable");
 const now=new Date().toISOString();
 const patch:any={status,resolution:resolution||null,updated_at:now};
 if(["resolved","rejected"].includes(status)){patch.resolved_at=now}
 const {error}=await db.from("buildpulse_editorial_cases").update(patch).eq("id",id);
 if(error)throw error;
 await db.from("buildpulse_workforce_audit_log").insert({action:"editorial_case_decision",resource_type:"editorial_case",resource_id:id,metadata:{status,resolution:resolution.slice(0,1000),reviewer:auth.email}});
 revalidatePath("/admin/editorial-cases");
}

export default async function EditorialCases(){
 const auth=await requireBuildPulseAdmin();
 if(!auth.ok)redirect((auth as any).mfaRequired?"/auth/mfa?next=/admin/editorial-cases":"/auth?next=/admin/editorial-cases");
 const db=createAdminClient();if(!db)throw new Error("Editorial case service unavailable");
 const {data:cases,error}=await db.from("buildpulse_editorial_cases").select("id,case_type,status,target_url,contact_email,summary,evidence,resolution,created_at,updated_at").order("created_at",{ascending:false}).limit(200);
 if(error)throw error;
 return <main className="min-h-screen bg-[#f5f4ef] text-[#111]"><div className="mx-auto max-w-6xl px-5 py-12"><p className="text-xs font-black uppercase tracking-[.18em] text-[#0b6b63]">BuildPulse Newsroom</p><h1 className="mt-2 text-4xl font-black">Corrections, complaints & takedowns</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Every request stays review-gated. Resolving a case records the decision in the workforce audit ledger; it does not silently rewrite published journalism.</p><div className="mt-8 grid gap-5">{(cases??[]).map((c:any)=><article key={c.id} className="rounded-2xl border border-black/15 bg-white p-5"><div className="flex flex-wrap gap-3 text-xs font-black uppercase tracking-wider"><span>{c.case_type}</span><span className="text-[#0b6b63]">{c.status}</span><span className="text-slate-400">{new Date(c.created_at).toLocaleString("en-GB",{timeZone:"UTC"})} UTC</span></div><a className="mt-3 block break-all font-bold underline" href={c.target_url} target="_blank" rel="noreferrer">{c.target_url}</a><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{c.summary}</p>{c.evidence&&<p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{c.evidence}</p>}<p className="mt-3 text-xs text-slate-500">Contact: {c.contact_email}</p><form action={decide} className="mt-4 grid gap-3 md:grid-cols-[180px_1fr_auto]"><input type="hidden" name="id" value={c.id}/><select name="status" defaultValue={c.status==="open"?"triage":c.status} className="rounded-lg border px-3 py-2"><option value="triage">Triage</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="rejected">Rejected</option></select><input name="resolution" defaultValue={c.resolution??""} maxLength={4000} placeholder="Decision / correction rationale" className="rounded-lg border px-3 py-2"/><button className="rounded-lg bg-black px-4 py-2 font-bold text-white">Record decision</button></form></article>)}</div></div></main>;
}
