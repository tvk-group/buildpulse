import Link from "next/link";
import {redirect} from "next/navigation";
import {requireBuildPulseWorkforce} from "@/lib/buildpulse/workforce-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {LocalizedCurrency,LocalizedDate} from "@/components/buildpulse/LocalizedValue";

export const metadata={title:"Finance | BuildPulse Control Plane",robots:{index:false,follow:false}};

export default async function FinancePage(){
 const auth=await requireBuildPulseWorkforce(["founder","admin","finance"]);
 if(!auth.ok)redirect(auth.reason==="mfa_required"?"/auth/mfa?next=/workforce/finance":"/auth?next=/workforce/finance");
 const db=createAdminClient();if(!db)throw new Error("Finance control unavailable");
 const entityResult=await db.from("buildpulse_accounting_entities").select("id,legal_name,company_number,base_currency,tax_registered").eq("is_default",true).maybeSingle();
 const entity:any=entityResult.data;
 const docsResult=await db.from("buildpulse_accounting_documents").select("id,document_number,document_type,currency,gross_amount,tax_amount,status,issued_at,paid_at,immutable_snapshot").order("issued_at",{ascending:false}).limit(100);
 const docs:any[]=docsResult.data??[];
 const periodsResult=await db.from("buildpulse_accounting_periods").select("id,period_start,period_end,status,closed_at").order("period_end",{ascending:false}).limit(24);
 const periods:any[]=periodsResult.data??[];
 const registrationsResult=await db.from("buildpulse_tax_registrations").select("id,jurisdiction,tax_type,status").order("jurisdiction");
 const registrations:any[]=registrationsResult.data??[];
 const foreignPaidResult=entity?.base_currency?await db.from("buildpulse_accounting_documents").select("id",{count:"exact",head:true}).eq("status","paid").neq("currency",entity.base_currency):({count:null,error:new Error("base_currency_unavailable")} as const);
 const unresolvedTaxResult=await db.from("buildpulse_accounting_documents").select("id",{count:"exact",head:true}).eq("status","paid").or("immutable_snapshot->automatic_tax->>enabled.is.null,immutable_snapshot->automatic_tax->>enabled.neq.true");
 const cryptoResult=await db.from("buildpulse_crypto_accounting_evidence").select("id",{count:"exact",head:true}).eq("tax_status","pending_determination");
 const reconciliationResult=await db.from("buildpulse_finance_reconciliation_queue").select("document_id,document_number,currency,gross_amount,reconciliation_state,item_type,reference_number",{count:"exact"}).neq("reconciliation_state","ok").limit(500);
 const cryptoTaxPendingCount=cryptoResult.count??0;
 const cryptoTaxUnavailable=Boolean(cryptoResult.error);
 const reconciliation:any[]=reconciliationResult.data??[];
 const reconciliationUnavailable=Boolean(reconciliationResult.error);
 const reconciliationExceptionCount=reconciliationResult.count??0;
 const reconciliationExceptionCount=reconciliationResult.count??0;
 const foreignPaidCount=foreignPaidResult.count??0;
 const unresolvedTaxCount=unresolvedTaxResult.count??0;
 const financeEvidenceUnavailable=Boolean(foreignPaidResult.error||unresolvedTaxResult.error);
 const closeReady=!financeEvidenceUnavailable&&!reconciliationUnavailable&&!cryptoTaxUnavailable&&foreignPaidCount===0&&unresolvedTaxCount===0&&cryptoTaxPendingCount===0&&reconciliationExceptionCount===0;
 return <main className="min-h-screen bg-[#f3f5f4] text-slate-950"><div className="mx-auto max-w-[1400px] px-5 py-8">
  <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-300 pb-6"><div><p className="text-xs font-black uppercase tracking-[.22em] text-[#0b6b63]">BuildPulse Finance</p><h1 className="mt-2 text-4xl font-black">Accounting & close control</h1><p className="mt-2 text-sm text-slate-500">{entity?.legal_name||"Accounting entity"} · {entity?.company_number||"—"} · {entity?.base_currency||"—"}</p></div><div className="flex flex-wrap gap-2"><a href="/api/workforce/finance/export?from=2026-01-01&to=2026-12-31" className="rounded-full border bg-white px-5 py-3 text-sm font-bold">Export 2026 journal CSV</a><Link href="/workforce/control" className="rounded-full border bg-white px-5 py-3 text-sm font-bold">Control Plane</Link></div></header>
  <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{[
   {label:"Paid FX pending",value:foreignPaidResult.error?"Unavailable":foreignPaidCount},
   {label:"Tax evidence pending",value:unresolvedTaxResult.error?"Unavailable":unresolvedTaxCount},
   {label:"Crypto tax pending",value:cryptoTaxUnavailable?"Unavailable":cryptoTaxPendingCount},
   {label:"Reconciliation exceptions",value:reconciliationUnavailable?"Unavailable":reconciliationExceptionCount},
   {label:"Close gate",value:closeReady?"Ready":"Blocked"}
  ].map(card=><div key={card.label} className="rounded-2xl border bg-white p-5"><p className="text-xs font-black uppercase text-slate-500">{card.label}</p><p className="mt-2 text-2xl font-black">{card.value}</p></div>)}</section>
  {!closeReady&&<div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-6"><b>Close remains fail-closed.</b> Foreign-currency, tax, crypto-tax or reconciliation evidence must be resolved before closing a period. If reconciliation or crypto-tax evidence cannot be queried, closing is blocked. BuildPulse does not infer registrations or FX rates.</div>}
  {reconciliation.length>0&&<section className="mt-6 rounded-3xl border border-amber-300 bg-amber-50 p-6"><p className="text-xs font-black uppercase text-amber-800">Reconciliation exceptions</p><h2 className="mt-1 text-2xl font-black">Financial documents requiring finance review</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b"><th className="py-3">Document</th><th>Type</th><th>Currency</th><th>Gross</th><th>Exception</th></tr></thead><tbody>{reconciliation.map((x:any)=><tr key={x.document_id} className="border-b"><td className="py-3 font-bold">{x.reference_number||x.document_number}</td><td>{String(x.item_type||"invoice").replaceAll("_"," ")}</td><td>{x.currency}</td><td><LocalizedCurrency value={x.gross_amount} currency={x.currency}/></td><td>{String(x.reconciliation_state).replaceAll("_"," ")}</td></tr>)}</tbody></table></div></section>}
  <section className="mt-6 rounded-3xl border bg-white p-6"><p className="text-xs font-black uppercase text-[#0b6b63]">Recent accounting documents</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b"><th className="py-3">Document</th><th>Type</th><th>Currency</th><th>Gross</th><th>Tax</th><th>Status</th><th>Issued</th></tr></thead><tbody>{docs.map(d=><tr key={d.id} className="border-b"><td className="py-3 font-bold">{d.document_number}</td><td>{d.document_type}</td><td>{d.currency}</td><td><LocalizedCurrency value={d.gross_amount} currency={d.currency}/></td><td><LocalizedCurrency value={d.tax_amount} currency={d.currency}/></td><td>{d.status}</td><td>{d.issued_at?<LocalizedDate value={d.issued_at} dateOnly/>:"—"}</td></tr>)}</tbody></table></div></section>
  <section className="mt-6 grid gap-6 xl:grid-cols-2"><div className="rounded-3xl border bg-white p-6"><p className="text-xs font-black uppercase text-[#0b6b63]">Accounting periods</p><div className="mt-4 space-y-2">{periods.length?periods.map(p=><div key={p.id} className="flex justify-between border-b py-3 text-sm"><b>{p.period_start} → {p.period_end}</b><span>{p.status}</span></div>):<p className="text-sm text-slate-600">No accounting periods created yet.</p>}</div></div>
  <div className="rounded-3xl border bg-white p-6"><p className="text-xs font-black uppercase text-[#0b6b63]">Tax registrations</p><div className="mt-4 space-y-2">{registrations.length?registrations.map(r=><div key={r.id} className="flex justify-between border-b py-3 text-sm"><b>{r.jurisdiction} · {r.tax_type}</b><span>{r.status}</span></div>):<p className="text-sm text-slate-600">No tax registration is recorded. BuildPulse will not invent one.</p>}</div></div></section>
 </div></main>;
}