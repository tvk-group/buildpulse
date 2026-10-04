import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {LocalizedPrice} from "@/components/buildpulse/LocalizedPrice";
import {LocalizedDate} from "@/components/buildpulse/LocalizedValue";

export const dynamic="force-dynamic";
export const metadata={title:"BuildPulse Invoice",description:"BuildPulse advertising invoice.",robots:{index:false,follow:false}};

export default async function InvoicePage({params}:{params:Promise<{invoiceNumber:string}>}){
  let supabase;
  try{supabase=await createClient()}catch{redirect("/auth?next=/advertiser")}
  const {data:{user}}=await supabase.auth.getUser();
  const {invoiceNumber}=await params;
  if(!user)redirect(`/auth?next=${encodeURIComponent(`/advertiser/invoices/${invoiceNumber}`)}`);
  const {data:invoice,error}=await supabase.from("buildpulse_billing_invoices")
    .select("id,invoice_number,issuer_name,issuer_company_number,issuer_registered_office,billing_company,billing_email,customer_type,billing_address_line1,billing_address_line2,billing_city,billing_region,billing_postal_code,billing_country_code,tax_id,tax_id_type,tax_id_validation_status,amount_usd,currency,payment_method,payment_reference,status,issued_at,paid_at,order_id")
    .eq("invoice_number",decodeURIComponent(invoiceNumber))
    .eq("user_id",user.id)
    .maybeSingle();
  if(error||!invoice)notFound();
  const [{data:order},{data:creditNotes}]=await Promise.all([
    supabase.from("buildpulse_ad_orders")
    .select("headline,copy_text,destination_url,status,created_at")
    .eq("id",invoice.order_id)
    .eq("user_id",user.id)
    .maybeSingle(),
    supabase.from("buildpulse_billing_credit_notes").select("credit_note_number,amount_usd,currency,reason,issued_at").eq("invoice_id",invoice.id).eq("user_id",user.id).order("issued_at",{ascending:true})
  ]);

  return <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950 print:bg-white print:p-0">
    <article className="mx-auto max-w-3xl rounded-2xl border bg-white p-8 shadow-sm print:max-w-none print:border-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b pb-7">
        <div><p className="text-xs font-black tracking-[.2em] text-slate-500">TVK BUILDPULSE</p><h1 className="mt-2 text-4xl font-black">Invoice</h1><p className="mt-2 font-mono text-sm">{invoice.invoice_number}</p></div>
        <div className="text-right text-sm"><p className="font-black">{invoice.issuer_name}</p><p>Company No. {invoice.issuer_company_number}</p><p className="mt-1 max-w-xs text-slate-600">{invoice.issuer_registered_office}</p></div>
      </header>
      <section className="grid gap-6 border-b py-7 md:grid-cols-2">
        <div><p className="text-xs font-black uppercase tracking-wider text-slate-500">Bill to</p><p className="mt-2 font-bold">{invoice.billing_company||"Advertiser"}</p><p className="text-sm text-slate-600">{invoice.billing_email||user.email}</p>{invoice.billing_address_line1&&<p className="mt-2 text-sm text-slate-600">{invoice.billing_address_line1}</p>}{invoice.billing_address_line2&&<p className="text-sm text-slate-600">{invoice.billing_address_line2}</p>}{(invoice.billing_city||invoice.billing_region||invoice.billing_postal_code)&&<p className="text-sm text-slate-600">{[invoice.billing_city,invoice.billing_region,invoice.billing_postal_code].filter(Boolean).join(", ")}</p>}{invoice.billing_country_code&&<p className="text-sm text-slate-600">{invoice.billing_country_code}</p>}{invoice.tax_id&&<p className="mt-2 text-xs text-slate-500">{invoice.tax_id_type||"Tax ID"}: {invoice.tax_id} · {invoice.tax_id_validation_status||"unverified"}</p>}</div>
        <div className="md:text-right"><p className="text-xs font-black uppercase tracking-wider text-slate-500">Status</p><p className="mt-2 text-xl font-black uppercase">{invoice.status}</p><p className="mt-1 text-sm text-slate-600">Issued <LocalizedDate value={invoice.issued_at}/></p>{invoice.paid_at&&<p className="text-sm text-slate-600">Paid <LocalizedDate value={invoice.paid_at}/></p>}</div>
      </section>
      <section className="border-b py-7">
        <div className="flex items-start justify-between gap-6"><div><p className="font-black">{order?.headline||"BuildPulse advertising placement"}</p><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{order?.copy_text||"Digital advertising placement on BuildPulse."}</p>{order?.destination_url&&<p className="mt-2 break-all text-xs text-slate-500">{order.destination_url}</p>}</div><p className="whitespace-nowrap text-xl font-black"><LocalizedPrice value={invoice.amount_usd} currency={invoice.currency}/></p></div>
      </section>
      <section className="py-7">
        <div className="flex justify-between text-lg"><span className="font-bold">Total</span><strong><LocalizedPrice value={invoice.amount_usd} currency={invoice.currency}/></strong></div>
        {invoice.payment_method&&<p className="mt-5 text-sm text-slate-600">Payment method: <span className="font-bold text-slate-900">{invoice.payment_method}</span></p>}
        {invoice.payment_reference&&<p className="mt-1 break-all text-xs text-slate-500">Payment reference: {invoice.payment_reference}</p>}
        {creditNotes&&creditNotes.length>0&&<div className="mt-6 rounded-xl border border-slate-200 p-4"><p className="text-xs font-black uppercase tracking-wider text-slate-500">Credit notes</p>{creditNotes.map(note=><div key={note.credit_note_number} className="mt-3 flex flex-wrap justify-between gap-3 text-sm"><div><p className="font-bold">{note.credit_note_number}</p><p className="text-xs text-slate-500">{note.reason.replaceAll("_"," ")} · <LocalizedDate value={note.issued_at}/></p></div><strong>-<LocalizedPrice value={note.amount_usd} currency={note.currency}/></strong></div>)}</div>}
        <p className="mt-6 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">Payment confirms commercial settlement only. Advertising remains subject to BuildPulse creative, safety and publication review.</p>
      </section>
      <footer className="flex flex-wrap gap-3 border-t pt-6 print:hidden">
        <Link href="/advertiser" className="rounded-xl border px-4 py-2 text-sm font-bold">← Advertiser portal</Link>
        <button type="button" onClick={()=>window.print()} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">Print / Save PDF</button>
        <p className="text-xs text-slate-500">This print-optimized invoice can be saved as PDF from the browser print dialog.</p>
      </footer>
    </article>
  </main>
}
