import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requireBuildPulseAdmin} from "@/lib/buildpulse/admin-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {LocalizedDate} from "@/components/buildpulse/LocalizedValue";

export const metadata={title:"Editorial Cases | BuildPulse",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function decide(formData:FormData){
 "use server";
 const auth=await requireBuildPulseAdmin();
 if(!auth.ok)redirect((auth as any).mfaRequired?"/auth/mfa?next=/admin/editorial-cases":"/auth?next=/admin/editorial-cases");
 const id=String(formData.get("id")||""),status=String(formData.get("status")||""),resolution=String(formData.get("resolution")||"").trim();
 if(!["review","dismissed"].includes(status)||!UUID.test(id))return;
 const db=createAdminClient();if(!db)throw new Error("Editorial case service unavailable");
 const now=new Date().toISOString();
 const patch:any={status,resolution_notes:resolution||null,updated_at:now};
 if(status==="dismissed"){patch.reviewed_at=now;patch.reviewed_by=auth.userId;patch.resolution_action="none"}
 const {data:updated,error}=await db.from("buildpulse_newsroom_cases").update(patch).eq("id",id).select("id").maybeSingle();
 if(error)throw error;
 if(!updated)throw new Error("Editorial case no longer exists");
 await db.from("buildpulse_workforce_audit_log").insert({actor_user_id:auth.userId,action:"editorial_case_decision",resource_type:"editorial_case",resource_id:id,metadata:{status,resolution:resolution.slice(0,1000),reviewer:auth.email}});
 revalidatePath("/admin/editorial-cases");
}

export default async function EditorialCases(){
 const auth=await requireBuildPulseAdmin();
 if(!auth.ok)redirect((auth as any).mfaRequired?"/auth/mfa?next=/admin/editorial-cases":"/auth?next=/admin/editorial-cases");
 const db=createAdminClient();if(!db)throw new Error("Editorial case service unavailable");
 const {data:cases,error}=await db.from("buildpulse_newsroom_cases").select("id,case_type,status,source_url,reporter_email,details,resolution_notes,created_at,updated_at").order("created_at",{ascending:false}).limit(200);
 if(error)throw error;
 return <main className="min-h-screen bg-[#f5f4ef] text-[#111]"><div className="mx-auto max-w-6xl px-5 py-12"><p className="text-xs font-black uppercase tracking-[.18em] text-[#0b6b63]">BuildPulse Newsroom</p><h1 className="mt-2 text-4xl font-black">Corrections, complaints & takedowns</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Every request stays review-gated. Resolving a case records the decision in the workforce audit ledger; it does not silently rewrite published journalism.</p><div className="mt-8 grid gap-5">{(cases??[]).map((c:any)=><article key={c.id} className="rounded-2xl border border-black/15 bg-white p-5"><div className="flex flex-wrap gap-3 text-xs font-black uppercase tracking-wider"><span>{c.case_type}</span><span className="text-[#0b6b63]">{c.status}</span><span className="text-slate-400"><LocalizedDate value={c.created_at}/></span></div><a className="mt-3 block break-all font-bold underline" href={c.source_url} target="_blank" rel="noreferrer">{c.source_url||"No target URL supplied"}</a><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{c.details}</p><p className="mt-3 text-xs text-slate-500">Contact: {c.reporter_email}</p><form action={decide} className="mt-4 grid gap-3 md:grid-cols-[180px_1fr_auto]"><input type="hidden" name="id" value={c.id}/><select name="status" defaultValue={c.status==="open"?"review":c.status} className="rounded-lg border px-3 py-2"><option value="review">Review</option><option value="dismissed">Dismissed</option></select><input name="resolution" defaultValue={c.resolution_notes??""} maxLength={4000} placeholder="Decision / correction rationale" className="rounded-lg border px-3 py-2"/><button className="rounded-lg bg-black px-4 py-2 font-bold text-white">Record decision</button></form></article>)}</div></div></main>;
}
