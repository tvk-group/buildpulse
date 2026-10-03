import Link from "next/link";
import {redirect} from "next/navigation";
import {requireBuildPulseWorkforce} from "@/lib/buildpulse/workforce-auth";
import {createAdminClient} from "@/lib/supabase/admin";

export const metadata={title:"Finance | BuildPulse Control Plane",robots:{index:false,follow:false}};

export default async function FinanceControlPage(){
 const auth=await requireBuildPulseWorkforce(["founder","admin","finance"]);
 if(!auth.ok)redirect(auth.reason==="mfa_required"?"/auth/mfa?next=/workforce/finance":"/auth?next=/workforce/finance");
 const db=createAdminClient();if(!db)throw new Error("Finance control unavailable");
 const [{data:entity},{data:trial},{data:monthly},{data:annual},{data:docs},{data:periods},{data:registrations},{data:credits},{data:cryptoEvidence}]=await Promise.all([
  db.from("buildpulse_accounting_entities").select("id,legal_name,company_number,country_code,base_currency,vat_number,tax_registered").eq("is_default",true).maybeSingle(),
  db.from("buildpulse_accounting_trial_balance").select("*"),
  db.from("buildpulse_accounting_monthly_summary").select("*").order("period_month",{ascending:false}).limit(24),
  db.from("buildpulse_accounting_annual_summary").select("*").order("fiscal_year",{ascending:false}).limit(10),
  db.from("buildpulse_accounting_documents").select("id,document_number,document_type,currency,gross_amount,tax_amount,status,issued_at,paid_at,immutable_snapshot").order("issued_at",{ascending:false}).limit(100),
  db.from("buildpulse_accounting_periods").select("id,period_start,period_end,status,closed_at").order("period_end",{ascending:false}).limit(24),
  db.from("buildpulse_tax_registrations").select("jurisdiction,tax_type,status,effective_from,effective_to").order("jurisdiction"),
  db.from("buildpulse_billing_credit_notes").select("credit_note_number,amount_usd,currency,reason,issued_at").order("issued_at",{ascending:false}).limit(50),
  db.from("buildpulse_crypto_accounting_evidence").select("asset,network,gross_amount_usd,tax_status,verified_at").order("verified_at",{ascending:false}).limit(100)
 ]);
 const t=trial??[],debits=t.reduce((n:number,x:any)=>n+Number(x.debit||0),0),credits=t.reduce((n:number,x:any)=>n+Number(x.credit||0),0);
 const balanced=Math.abs(debits-credits)<0.00001;
 const foreignPaid=(docs??[]).filter((d:any)=>d.status==="paid"&&d.currency!==entity?.base_currency);
 const taxPending=(docs??[]).filter((d:any)=>d.status==="paid"&&!d.immutable_snapshot?.automatic_tax?.enabled);
 const cryptoTaxPending=(cryptoEvidence??[]).filter((x:any)=>x.tax_status==="pending_determination");
 const closeReady=balanced&&foreignPaid.length===0&&taxPending.length===0&&cryptoTaxPending.length===0;
 return <main className="min-h-screen bg-[#f3f5f4] text-slate-950"><div className="mx-auto max-w-[1500px] px-5 py-8">
  <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-300 pb-6"><div><p className="text-xs font-black uppercase tracking-[.22em] text-[#0b6b63]">BuildPulse Finance</p><h1 className="mt-2 text-4xl font-black tracking-tight">Accounting & close control</h1><p className="mt-2 text-sm text-slate-500">{entity?.legal_name||"Accounting entity"} · {entity?.company_number||"—"} · base currency {entity?.base_currency||"—"}</p></div><Link href="/workforce/control" className="rounded-full border bg-white px-5 py-3 text-sm font-bold">Control Plane</Link></header>
  <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{[["Ledger",balanced?"Balanced":"Out of balance"],["Paid FX pending",foreignPaid.length],["Tax evidence pending",taxPending.length],["Crypto tax pending",cryptoTaxPending.length],["Close gate",closeReady?"Ready":"Blocked"]].map(([k,v])=><div key={String(k)} className="rounded-2xl border bg-white p-5"><p className="text-xs font-black uppercase text-slate-500">{k}</p><p className="mt-2 text-2xl font-black">{v}</p></div>)}</section>
  {!closeReady&&<section className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><b>Close remains fail-closed.</b> Resolve foreign-currency FX evidence, tax determination and any ledger imbalance before a period is marked closed. No tax registration or FX rate is inferred by BuildPulse.</section>}
  <section className="mt-6 grid gap-6 xl:grid-cols-2"><div className="rounded-3xl border bg-white p-6"><p className="text-xs font-black uppercase text-[#0b6b63]">Trial balance</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b"><th className="py-3">Account</th><th>Type</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>{t.map((x:any)=><tr key={x.account_code} className="border-b"><td className="py-3 font-bold">{x.account_code} · {x.name}</td><td>{x.account_type}</td><td>{Number(x.debit).toFixed(2)}</td><td>{Number(x.credit).toFixed(2)}</td><td>{Number(x.balance).toFixed(2)}</td></tr>)}</tbody></table></div></div>
  <div className="rounded-3xl border bg-white p-6"><p className="text-xs font-black uppercase text-[#0b6b63]">Monthly P&L / tax</p><div className="mt-4 space-y-3">{(monthly??[]).map((x:any)=><div key={x.period_month} className="grid grid-cols-4 gap-2 border-b pb-3 text-sm"><b>{x.period_month}</b><span>Revenue {Number(x.revenue).toFixed(2)}</span><span>Expense {Number(x.expenses).toFixed(2)}</span><span>Tax {Number(x.tax_payable).toFixed(2)}</span></div>)}</div></div></section>
  <section className="mt-6 grid gap-6 xl:grid-cols-2"><div className="rounded-3xl border bg-white p-6"><p className="text-xs font-black uppercase text-[#0b6b63]">Accounting periods</p><div className="mt-4 space-y-2">{(periods??[]).map((x:any)=><div key={x.id} className="flex justify-between border-b py-3 text-sm"><b>{x.period_start} → {x.period_end}</b><span>{x.status}</span></div>)}</div></div>
  <div className="rounded-3xl border bg-white p-6"><p className="text-xs font-black uppercase text-[#0b6b63]">Tax registrations</p><div className="mt-4 space-y-2">{registrations?.length?(registrations??[]).map((x:any)=><div key={x.jurisdiction+":"+x.tax_type} className="flex justify-between border-b py-3 text-sm"><b>{x.jurisdiction} · {x.tax_type}</b><span>{x.status}</span></div>):<p className="text-sm text-slate-600">No tax registration is recorded. BuildPulse will not invent one.</p>}</div></div></section>
  <section className="mt-6 rounded-3xl border bg-white p-6"><p className="text-xs font-black uppercase text-[#0b6b63]">Annual summary</p><div className="mt-4 grid gap-3 md:grid-cols-3">{(annual??[]).map((x:any)=><div key={x.fiscal_year} className="rounded-xl border p-4"><b>{x.fiscal_year}</b><p className="mt-2 text-sm">Revenue {Number(x.revenue).toFixed(2)}</p><p className="text-sm">Expenses {Number(x.expenses).toFixed(2)}</p><p className="text-sm">Operating result {Number(x.operating_result).toFixed(2)}</p></div>)}</div><p className="mt-5 text-xs text-slate-500">Credit notes recorded: {credits?.length??0}. This surface is operational reporting, not a filed statutory return.</p></section>
 </div></main>
}