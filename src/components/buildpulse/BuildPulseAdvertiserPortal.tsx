"use client";

import {FormEvent,useEffect,useMemo,useState} from "react";
import {useSearchParams} from "next/navigation";
import {createClient} from "@/utils/supabase/client";
import {formatLocalCurrency,formatLocalDate,formatLocalNumber} from "@/lib/buildpulse/localization";

type Product={code:string;name:string;placement:string;width_px:number|null;height_px:number|null;max_copy_chars:number;price_usd:number|string;duration_days:number};
type Order={id:string;headline:string|null;copy_text:string|null;destination_url:string;status:string;amount_usd:number|string;created_at:string;payment_method?:string|null};
type Metric={id:string;impressions:number;clicks:number;ctr:number};
type Quote={order_id:string;asset:string;network:string;expected_amount:number|string;destination:string;memo:string|null;expires_at:string;state:string;required_confirmations?:number};
type Invoice={order_id:string;invoice_number:string;status:string;issuer_name:string;issuer_company_number:string|null;amount_usd:number|string;currency:string;payment_method:string|null};
type PaymentMethod={method:string;label:string;network?:string;requiresMemo?:boolean};

export function BuildPulseAdvertiserPortal(){
  const search=useSearchParams(),supabase=useMemo(()=>createClient(),[]);
  const [userId,setUserId]=useState<string|null>(null);
  const [email,setEmail]=useState(""),[password,setPassword]=useState("");
  const [company,setCompany]=useState(""),[billingEmail,setBillingEmail]=useState(""),[website,setWebsite]=useState("");
  const [customerType,setCustomerType]=useState<"b2b"|"b2c">("b2b"),[address1,setAddress1]=useState(""),[address2,setAddress2]=useState("");
  const [city,setCity]=useState(""),[region,setRegion]=useState(""),[postalCode,setPostalCode]=useState(""),[countryCode,setCountryCode]=useState("");
  const [taxId,setTaxId]=useState(""),[taxIdType,setTaxIdType]=useState("");
  const [products,setProducts]=useState<Product[]>([]),[orders,setOrders]=useState<Order[]>([]);
  const [metrics,setMetrics]=useState<Record<string,Metric>>({}),[quotes,setQuotes]=useState<Record<string,Quote>>({}),[invoices,setInvoices]=useState<Record<string,Invoice>>({});
  const [paymentMethods,setPaymentMethods]=useState<PaymentMethod[]>([]),[cryptoStatus,setCryptoStatus]=useState<"ready"|"configuration_incomplete"|"capability_check_failed"|"loading">("loading"),[missingCrypto,setMissingCrypto]=useState<string[]>([]);
  const [txHashes,setTxHashes]=useState<Record<string,string>>({});
  const [product,setProduct]=useState(search.get("product")??""),[headline,setHeadline]=useState(""),[copy,setCopy]=useState(""),[destination,setDestination]=useState("");
  const [message,setMessage]=useState(search.get("payment")==="success"?"Payment received by Stripe. Confirmation is being finalized.":search.get("payment")==="cancelled"?"Stripe Checkout was cancelled. Your campaign remains unpaid.":"");
  const [busy,setBusy]=useState(false);
  const selected=products.find(x=>x.code===product);

  async function refresh(uid?:string){
    const [{data:p,error:pError},{data:o,error:oError},{data:profile,error:profileError}]=await Promise.all([
      supabase.from("buildpulse_ad_products").select("code,name,placement,width_px,height_px,max_copy_chars,price_usd,duration_days").eq("active",true).order("price_usd"),
      supabase.from("buildpulse_ad_orders").select("id,headline,copy_text,destination_url,status,amount_usd,created_at,payment_method").order("created_at",{ascending:false}).limit(50),
      supabase.from("buildpulse_advertiser_profiles").select("company_name,billing_email,website_url,customer_type,billing_address_line1,billing_address_line2,billing_city,billing_region,billing_postal_code,billing_country_code,tax_id,tax_id_type,tax_id_validation_status").maybeSingle()
    ]);
    if(pError||oError||profileError){setMessage((pError??oError??profileError)?.message??"Could not load advertiser data.");if(uid)setUserId(uid);return}
    setProducts((p??[]) as Product[]);setOrders((o??[]) as Order[]);
    if(profile){setCompany(profile.company_name??"");setBillingEmail(profile.billing_email??"");setWebsite(profile.website_url??"");setCustomerType(profile.customer_type==="b2c"?"b2c":"b2b");setAddress1(profile.billing_address_line1??"");setAddress2(profile.billing_address_line2??"");setCity(profile.billing_city??"");setRegion(profile.billing_region??"");setPostalCode(profile.billing_postal_code??"");setCountryCode(profile.billing_country_code??"");setTaxId(profile.tax_id??"");setTaxIdType(profile.tax_id_type??"")}
    if(!product&&p?.[0])setProduct(p[0].code);
    if(uid){
      setUserId(uid);
      const [{data:q},{data:i},methods,report]=await Promise.all([
        supabase.from("buildpulse_ad_payment_quotes").select("order_id,asset,network,expected_amount,destination,memo,expires_at,state,required_confirmations").in("state",["open","observed"]).order("created_at",{ascending:false}),
        supabase.from("buildpulse_billing_invoices").select("order_id,invoice_number,status,issuer_name,issuer_company_number,amount_usd,currency,payment_method").order("created_at",{ascending:false}),
        fetch("/api/buildpulse/advertiser/checkout",{credentials:"include"}).then(r=>r.ok?r.json():null).catch(()=>null),
        fetch("/api/buildpulse/advertiser/report",{credentials:"include"}).then(r=>r.ok?r.json():null).catch(()=>null)
      ]);
      if(q)setQuotes(Object.fromEntries((q as Quote[]).map(item=>[item.order_id,item])));
      if(i)setInvoices(Object.fromEntries((i as Invoice[]).map(item=>[item.order_id,item])));
      if(methods?.methods)setPaymentMethods(methods.methods as PaymentMethod[]);if(methods?.cryptoStatus)setCryptoStatus(methods.cryptoStatus);if(Array.isArray(methods?.missingCryptoAssets))setMissingCrypto(methods.missingCryptoAssets);
      if(report?.campaigns)setMetrics(Object.fromEntries((report.campaigns as Metric[]).map((item:Metric)=>[item.id,item])));
    }
  }

  useEffect(()=>{supabase.auth.getUser().then(({data})=>{setUserId(data.user?.id??null);void refresh(data.user?.id)});const {data:s}=supabase.auth.onAuthStateChange((_e,session)=>{setUserId(session?.user?.id??null);void refresh(session?.user?.id)});return()=>s.subscription.unsubscribe()},[]);

  async function signIn(e:FormEvent){e.preventDefault();setBusy(true);setMessage("");const {error}=await supabase.auth.signInWithPassword({email,password});setMessage(error?error.message:"Signed in.");setBusy(false)}
  async function signUp(){setBusy(true);setMessage("");const {error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:`${window.location.origin}/advertiser`}});setMessage(error?error.message:"Account created. Check your email if confirmation is required.");setBusy(false)}
  async function saveProfile(e:FormEvent){e.preventDefault();if(!userId)return;setBusy(true);setMessage("");try{const response=await fetch("/api/buildpulse/advertiser/profile",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({companyName:company,billingEmail,websiteUrl:website,customerType,billingAddressLine1:address1,billingAddressLine2:address2,billingCity:city,billingRegion:region,billingPostalCode:postalCode,billingCountryCode:countryCode.toUpperCase(),taxId,taxIdType})});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(typeof body.error==="string"?body.error:"Advertiser profile could not be saved");setMessage("Advertiser profile saved.")}catch(error){setMessage(error instanceof Error?error.message:"Advertiser profile could not be saved")}finally{setBusy(false)}}
  async function createOrder(e:FormEvent){e.preventDefault();setBusy(true);setMessage("");try{const response=await fetch("/api/buildpulse/advertiser/orders",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({productCode:product,headline,copyText:copy,destinationUrl:destination})});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(typeof body.error==="string"?body.error:"Campaign draft could not be created");setMessage(`Draft campaign created: ${body.order?.id??""}`);setHeadline("");setCopy("");setDestination("");await refresh(userId??undefined)}catch(error){setMessage(error instanceof Error?error.message:"Campaign draft could not be created")}finally{setBusy(false)}}
  async function uploadCreative(orderId:string,file:File|null){if(!file)return;setBusy(true);setMessage("");try{const form=new FormData();form.set("orderId",orderId);form.set("file",file);const response=await fetch("/api/buildpulse/advertiser/creative",{method:"POST",credentials:"include",body:form});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(typeof body.error==="string"?body.error:"Creative upload failed");setMessage("Creative uploaded and queued for review.")}catch(error){setMessage(error instanceof Error?error.message:"Creative upload failed")}finally{setBusy(false)}}

  async function startPayment(orderId:string,payment:PaymentMethod){
    setBusy(true);setMessage("");
    try{
      const action=payment.method==="stripe"?"stripe":"quote";
      const body=payment.method==="stripe"?{action,orderId}:{action,orderId,asset:payment.method,network:payment.network};
      const {data,error}=await supabase.functions.invoke("buildpulse-payment",{body});
      if(error)throw error;
      if(!data?.ok)throw new Error(typeof data?.error==="string"?data.error:"Payment could not be initialized");
      if(payment.method==="stripe"){
        if(!data.checkoutUrl)throw new Error("Stripe Checkout URL was not returned");
        window.location.assign(data.checkoutUrl);
        return;
      }
      setMessage(`${data.quote.asset} payment quote created. Send the exact amount before the quote expires.`);
      await refresh(userId??undefined);
    }catch(error){setMessage(error instanceof Error?error.message:"Payment could not be initialized")}finally{setBusy(false)}
  }

  async function verifyCryptoPayment(orderId:string){
    const txHash=(txHashes[orderId]??"").trim();
    if(!txHash){setMessage("Enter the transaction hash first.");return}
    setBusy(true);setMessage("");
    try{
      const {data,error}=await supabase.functions.invoke("buildpulse-payment",{body:{action:"verify",orderId,txHash}});
      if(error)throw error;
      if(!data?.ok)throw new Error(typeof data?.error==="string"?data.error:"Transaction could not be verified");
      if(data.state==="confirmed")setMessage(`Payment confirmed on-chain with ${data.confirmations} confirmation${data.confirmations===1?"":"s"}. Your campaign is now in review.`);
      else setMessage(`Payment detected with ${data.confirmations??0} confirmation${data.confirmations===1?"":"s"}. Required: ${data.requiredConfirmations??"more"}.`);
      await refresh(userId??undefined);
    }catch(error){setMessage(error instanceof Error?error.message:"Transaction could not be verified")}finally{setBusy(false)}
  }

  if(!userId)return <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"><h2 className="text-2xl font-black">Advertiser account</h2><p className="mt-2 text-slate-600">Sign in or create an account to prepare campaigns. Payment never causes automatic publication.</p><form onSubmit={signIn} className="mt-6 grid gap-3"><input className="rounded-xl border px-4 py-3" type="email" required placeholder="Business email" value={email} onChange={e=>setEmail(e.target.value)}/><input className="rounded-xl border px-4 py-3" type="password" required minLength={8} placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/><div className="flex gap-3"><button disabled={busy} className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white">Sign in</button><button disabled={busy} type="button" onClick={signUp} className="rounded-xl border px-5 py-3 font-bold">Create account</button></div></form>{message&&<p className="mt-4 text-sm text-slate-600">{message}</p>}</section>;

  return <div className="grid gap-8">
    <section className="rounded-3xl border bg-white p-7"><div className="flex items-center justify-between gap-4"><div><h2 className="text-2xl font-black">Advertiser profile</h2><p className="mt-1 text-sm text-slate-500">Billing and company identity.</p></div><button onClick={()=>supabase.auth.signOut()} className="text-sm font-bold underline">Sign out</button></div><form onSubmit={saveProfile} className="mt-6 grid gap-3 md:grid-cols-2"><input className="rounded-xl border px-4 py-3" placeholder="Company name" value={company} onChange={e=>setCompany(e.target.value)}/><input className="rounded-xl border px-4 py-3" type="email" placeholder="Billing email" value={billingEmail} onChange={e=>setBillingEmail(e.target.value)}/><input className="rounded-xl border px-4 py-3 md:col-span-2" type="url" placeholder="https://company.example" value={website} onChange={e=>setWebsite(e.target.value)}/><select className="rounded-xl border px-4 py-3" value={customerType} onChange={e=>setCustomerType(e.target.value==="b2c"?"b2c":"b2b")}><option value="b2b">Business customer (B2B)</option><option value="b2c">Consumer (B2C)</option></select><input className="rounded-xl border px-4 py-3" placeholder="Billing address line 1" value={address1} onChange={e=>setAddress1(e.target.value)}/><input className="rounded-xl border px-4 py-3" placeholder="Billing address line 2 (optional)" value={address2} onChange={e=>setAddress2(e.target.value)}/><input className="rounded-xl border px-4 py-3" placeholder="City" value={city} onChange={e=>setCity(e.target.value)}/><input className="rounded-xl border px-4 py-3" placeholder="State / region" value={region} onChange={e=>setRegion(e.target.value)}/><input className="rounded-xl border px-4 py-3" placeholder="Postal code" value={postalCode} onChange={e=>setPostalCode(e.target.value)}/><input className="rounded-xl border px-4 py-3 uppercase" maxLength={2} placeholder="Country code (GB, DE, TR…)" value={countryCode} onChange={e=>setCountryCode(e.target.value.toUpperCase())}/><input className="rounded-xl border px-4 py-3" placeholder="Tax ID type (VAT, GST, EIN…)" value={taxIdType} onChange={e=>setTaxIdType(e.target.value)}/><input className="rounded-xl border px-4 py-3" placeholder="Tax ID (optional)" value={taxId} onChange={e=>setTaxId(e.target.value)}/><p className="text-xs text-slate-500 md:col-span-2">Tax IDs are stored as customer-supplied and remain unverified until validated by an authoritative tax service.</p><button disabled={busy} className="w-fit rounded-xl bg-slate-950 px-5 py-3 font-bold text-white">Save profile</button></form></section>

    <section className="rounded-3xl border bg-white p-7"><h2 className="text-2xl font-black">Create campaign draft</h2><p className="mt-2 text-sm text-slate-600">Price, duration and copy limits are enforced server-side from the selected inventory product.</p><form onSubmit={createOrder} className="mt-6 grid gap-4"><select required className="rounded-xl border px-4 py-3" value={product} onChange={e=>setProduct(e.target.value)}>{products.map(x=><option key={x.code} value={x.code}>{x.name} — {formatLocalCurrency(Number(x.price_usd),"USD",{maximumFractionDigits:0})} / {x.duration_days}d</option>)}</select>{selected&&<p className="text-xs font-bold uppercase tracking-wider text-slate-500">{selected.width_px&&selected.height_px?`${selected.width_px} × ${selected.height_px}px · `:""}maximum {selected.max_copy_chars} characters</p>}<input className="rounded-xl border px-4 py-3" maxLength={120} placeholder="Campaign headline" value={headline} onChange={e=>setHeadline(e.target.value)}/><textarea required className="min-h-32 rounded-xl border px-4 py-3" maxLength={selected?.max_copy_chars??300} placeholder="Sponsor copy" value={copy} onChange={e=>setCopy(e.target.value)}/><div className="text-right text-xs text-slate-500">{copy.length}/{selected?.max_copy_chars??300}</div><input required className="rounded-xl border px-4 py-3" type="url" pattern="https://.*" placeholder="https://destination.example" value={destination} onChange={e=>setDestination(e.target.value)}/><button disabled={busy||!product} className="w-fit rounded-xl bg-slate-950 px-5 py-3 font-bold text-white">Create draft</button></form>{message&&<p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}</section>

    <section className="rounded-3xl border bg-white p-7"><h2 className="text-2xl font-black">Campaigns & payments</h2><p className="mt-2 text-sm text-slate-600">Choose Stripe/card or a configured crypto rail. Crypto quotes expire after 30 minutes. All paid campaigns still require review.</p><div className="mt-5 grid gap-4">{orders.map(o=><article key={o.id} className="rounded-2xl border p-4"><div className="flex flex-wrap justify-between gap-3"><strong>{o.headline||"Untitled campaign"}</strong><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase">{o.status}</span></div><p className="mt-2 text-sm text-slate-600">{o.copy_text}</p><p className="mt-2 text-xs text-slate-500">{formatLocalCurrency(Number(o.amount_usd),"USD",{maximumFractionDigits:2})} · {formatLocalDate(o.created_at)}</p>
      {invoices[o.id]&&<div className="mt-3 rounded-xl border bg-white p-3 text-xs"><p className="font-bold"><a className="underline" href={`/advertiser/invoices/${encodeURIComponent(invoices[o.id].invoice_number)}`}>Invoice {invoices[o.id].invoice_number}</a> · {invoices[o.id].status}</p><p className="mt-1">{invoices[o.id].issuer_name} · Company No. {invoices[o.id].issuer_company_number}</p><p className="mt-1">{formatLocalCurrency(Number(invoices[o.id].amount_usd),invoices[o.id].currency,{maximumFractionDigits:2})}{invoices[o.id].payment_method?` · ${invoices[o.id].payment_method}`:""}</p></div>}
      {quotes[o.id]&&<div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs"><p className="font-bold">Crypto invoice · {quotes[o.id].state}</p><p className="mt-1">Send exactly <span className="font-mono font-bold">{String(quotes[o.id].expected_amount)} {quotes[o.id].asset}</span> on {quotes[o.id].network}</p><p className="mt-1 break-all font-mono">{quotes[o.id].destination}</p>{quotes[o.id].memo&&<p className="mt-1">Destination tag / memo: <span className="font-mono font-bold">{quotes[o.id].memo}</span></p>}<p className="mt-1 text-slate-500">Requires {quotes[o.id].required_confirmations??1} confirmation{(quotes[o.id].required_confirmations??1)===1?"":"s"} · expires {formatLocalDate(quotes[o.id].expires_at)}</p>{["open","observed"].includes(quotes[o.id].state)&&<div className="mt-3 flex flex-col gap-2 sm:flex-row"><input className="min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 font-mono text-xs" placeholder="Paste transaction hash after payment" value={txHashes[o.id]??""} onChange={e=>setTxHashes(current=>({...current,[o.id]:e.target.value}))}/><button type="button" disabled={busy} onClick={()=>void verifyCryptoPayment(o.id)} className="rounded-lg bg-slate-950 px-3 py-2 font-bold text-white">Verify transaction</button></div>}</div>}
      {["draft","awaiting_payment"].includes(o.status)&&<div className="mt-4"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Pay invoice</p><div className="flex flex-wrap gap-2">{paymentMethods.map(m=><button key={m.method} disabled={busy} onClick={()=>void startPayment(o.id,m)} className="rounded-xl border bg-white px-3 py-2 text-xs font-black hover:bg-slate-50">{m.label}{m.network?` · ${m.network}`:""}</button>)}</div>{cryptoStatus==="configuration_incomplete"&&<p className="w-full text-xs font-semibold text-amber-700">Crypto settlement is being configured. Missing production rails: {missingCrypto.join(", ")}. Card / Stripe remains available.</p>}{cryptoStatus==="capability_check_failed"&&<p className="w-full text-xs font-semibold text-rose-700">Crypto settlement status could not be verified. Crypto checkout is temporarily fail-closed; card / Stripe remains available.</p>}{paymentMethods.length===0&&<p className="text-xs text-amber-700">Payment rails are not yet configured on this deployment.</p>}</div>}
      {metrics[o.id]&&<p className="mt-3 text-xs font-semibold text-slate-600">{formatLocalNumber(metrics[o.id].impressions)} verified impressions · {formatLocalNumber(metrics[o.id].clicks)} verified clicks · {metrics[o.id].ctr}% CTR</p>}
      {["draft","awaiting_payment","payment_detected","review"].includes(o.status)&&<label className="mt-3 inline-flex cursor-pointer rounded-xl border px-3 py-2 text-xs font-bold">Upload PNG/JPEG/WebP creative<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>void uploadCreative(o.id,e.target.files?.[0]??null)}/></label>}
    </article>)}{orders.length===0&&<p className="text-slate-500">No campaigns yet.</p>}</div></section>
  </div>
}
