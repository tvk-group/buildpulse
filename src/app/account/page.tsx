import Link from "next/link";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {createClientSafe} from "@/utils/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";

export const metadata={title:"Account | BuildPulse",robots:{index:false,follow:false}};

export default async function AccountPage(){
 const supabase=createClientSafe(await cookies());if(!supabase)redirect("/auth?next=/account");
 const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/auth?next=/account");
 await supabase.rpc("buildpulse_claim_own_subscriptions");
 const db=createAdminClient();if(!db)throw new Error("Account service unavailable");
 const [{data:subs},{data:customer},{data:social},{count:contrib},{count:arts},{count:ads}]=await Promise.all([
  db.from("buildpulse_intelligence_subscriptions").select("id,plan_code,billing_interval,status,current_period_end,cancelled_at,created_at").or(`user_id.eq.${user.id},email.eq.${String(user.email).toLowerCase()}`).order("created_at",{ascending:false}).limit(5),
  db.from("buildpulse_accounting_customers").select("id,legal_name,business_customer,country_code,tax_id_status,billing_address").or(`user_id.eq.${user.id},email.eq.${String(user.email).toLowerCase()}`).limit(1).maybeSingle(),
  db.from("buildpulse_social_profiles").select("handle,display_name,account_type,verified_kind").eq("user_id",user.id).maybeSingle(),
  db.from("buildpulse_contributor_submissions").select("id",{head:true,count:"exact"}).eq("user_id",user.id),
  db.from("buildpulse_art_submissions").select("id",{head:true,count:"exact"}).eq("user_id",user.id),
  db.from("buildpulse_ad_orders").select("id",{head:true,count:"exact"}).eq("user_id",user.id)
 ]);
 const docs=customer?.id?(await db.from("buildpulse_accounting_documents").select("id,document_number,document_type,currency,gross_amount,status,issued_at,paid_at,provider_pdf_url").eq("customer_id",customer.id).order("created_at",{ascending:false}).limit(20)).data??[]:[];
 const active=(subs??[]).find((s:any)=>["active","trialing"].includes(s.status));
 const cards=[["Intelligence",active?active.plan_code:"No active plan","/subscriptions"],["Invoices & receipts",docs.length,"/account#documents"],["Contributor submissions",contrib??0,"/contribute"],["Art submissions",arts??0,"/arts/contribute"],["Advertising campaigns",ads??0,"/advertiser"],["Social",social?("@"+social.handle):"Set up profile","/social"]];
 return <main className="min-h-screen bg-[#fbfaf6] text-[#17202a]"><div className="mx-auto max-w-[1280px] px-5 py-12">
  <div className="border-b border-black/15 pb-7"><p className="text-xs font-black uppercase tracking-[.18em] text-[#0b6b63]">BuildPulse Account</p><h1 className="mt-2 text-4xl font-black tracking-tight">Your client portal</h1><p className="mt-3 text-sm text-slate-600">{user.email}</p></div>
  <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([n,v,h])=><Link key={String(n)} href={String(h)} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wider text-slate-500">{n}</p><p className="mt-2 text-xl font-black">{v}</p></Link>)}</section>
  <section className="mt-8 grid gap-6 lg:grid-cols-2"><div className="rounded-3xl border border-black/10 bg-white p-6"><p className="text-xs font-black uppercase tracking-wider text-[#0b6b63]">Subscription</p><h2 className="mt-1 text-2xl font-black">BuildPulse Intelligence</h2>{active?<div className="mt-4 text-sm leading-7"><p><b>Plan:</b> {active.plan_code}</p><p><b>Billing:</b> {active.billing_interval}</p><p><b>Status:</b> {active.status}</p>{active.current_period_end&&<p><b>Current period:</b> through {new Date(active.current_period_end).toLocaleDateString("en-GB")}</p>}</div>:<p className="mt-4 text-sm text-slate-600">No active Intelligence entitlement is linked to this account.</p>}</div>
  <div className="rounded-3xl border border-black/10 bg-white p-6"><p className="text-xs font-black uppercase tracking-wider text-[#0b6b63]">Billing profile</p><h2 className="mt-1 text-2xl font-black">{customer?.legal_name||"Personal account"}</h2><div className="mt-4 text-sm leading-7 text-slate-600"><p>Country: {customer?.country_code||"Not supplied"}</p><p>Account type: {customer?.business_customer?"Business":"Consumer / not classified as business"}</p><p>Tax ID: {customer?.tax_id_status||"Not supplied"}</p></div><p className="mt-4 text-xs leading-5 text-slate-500">Tax treatment is determined from validated billing/tax evidence and applicable registrations, not from browser language or location alone.</p></div></section>
  <section id="documents" className="mt-8 rounded-3xl border border-black/10 bg-white p-6"><p className="text-xs font-black uppercase tracking-wider text-[#0b6b63]">Documents</p><h2 className="mt-1 text-2xl font-black">Invoices, receipts & credit notes</h2>{docs.length?<div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-3">Document</th><th>Type</th><th>Amount</th><th>Status</th><th>Issued</th></tr></thead><tbody>{docs.map((d:any)=><tr key={d.id} className="border-b"><td className="py-4 font-bold">{d.provider_pdf_url?<a href={d.provider_pdf_url} target="_blank" rel="noreferrer" className="underline">{d.document_number}</a>:d.document_number}</td><td>{d.document_type}</td><td>{d.currency} {Number(d.gross_amount).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td><td>{d.status}</td><td>{d.issued_at?new Date(d.issued_at).toLocaleDateString("en-GB"):"—"}</td></tr>)}</tbody></table></div>:<p className="mt-4 text-sm text-slate-600">No accounting documents are linked to this account yet.</p>}</section>
 </div></main>
}