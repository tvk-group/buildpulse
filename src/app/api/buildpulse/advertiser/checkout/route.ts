import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getServerEnv} from "@/config/env";
import {buildPulseInvoiceIssuer,configuredCryptoRails,fetchUsdSpot,getCryptoRail,invoiceNumberForOrder,quoteAmount} from "@/lib/buildpulse/payments";

const schema=z.object({
  orderId:z.string().uuid(),
  method:z.enum(["stripe","ETH","BTC","USDC","USDT","XRP"])
});

async function authenticatedContext(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  return user;
}

async function ensureInvoice(admin:ReturnType<typeof createAdminClient>,order:any,profile:any,method:string){
  if(!admin)throw new Error("service_unavailable");
  const invoiceNumber=invoiceNumberForOrder(order.id,order.created_at);
  const payload={
    order_id:order.id,user_id:order.user_id,invoice_number:invoiceNumber,
    issuer_name:buildPulseInvoiceIssuer.name,
    issuer_company_number:buildPulseInvoiceIssuer.companyNumber,
    issuer_registered_office:buildPulseInvoiceIssuer.registeredOffice,
    billing_company:profile?.company_name??null,
    billing_email:profile?.billing_email??null,
    amount_usd:order.amount_usd,currency:"USD",payment_method:method,status:"open",
    updated_at:new Date().toISOString()
  };
  const {data,error}=await admin.from("buildpulse_billing_invoices").upsert(payload,{onConflict:"order_id"}).select("invoice_number,status,amount_usd,currency,issuer_name,issuer_company_number,issuer_registered_office,billing_company,billing_email").single();
  if(error||!data)throw new Error("invoice_persistence_failed");
  return data;
}

export async function GET(){
  const user=await authenticatedContext();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
  const env=getServerEnv();
  return NextResponse.json({
    ok:true,
    methods:[
      {method:"stripe",label:"Card / Stripe"},
      ...configuredCryptoRails().map(r=>({method:r.asset,label:r.asset,network:r.network,requiresMemo:Boolean(r.memo)}))
    ],
    issuer:buildPulseInvoiceIssuer
  });
}

export async function POST(req:NextRequest){
  const user=await authenticatedContext();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
  const parsed=schema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Invalid payment request"},{status:400});
  const admin=createAdminClient();
  if(!admin)return NextResponse.json({error:"Service unavailable"},{status:503});

  const [{data:order,error:orderError},{data:profile}]=await Promise.all([
    admin.from("buildpulse_ad_orders").select("id,user_id,status,amount_usd,created_at,payment_reference").eq("id",parsed.data.orderId).eq("user_id",user.id).maybeSingle(),
    admin.from("buildpulse_advertiser_profiles").select("company_name,billing_email,status").eq("user_id",user.id).maybeSingle()
  ]);
  if(orderError||!order)return NextResponse.json({error:"Order not found"},{status:404});
  if(!profile||profile.status!=="active")return NextResponse.json({error:"Active advertiser profile required"},{status:403});
  if(!["draft","awaiting_payment"].includes(order.status))return NextResponse.json({error:"Order is not payable in its current state"},{status:409});

  try{
    const invoice=await ensureInvoice(admin,order,profile,parsed.data.method);
    if(parsed.data.method==="stripe"){
      const secret=getServerEnv().STRIPE_SECRET_KEY;
      if(!secret)return NextResponse.json({error:"Stripe is not configured"},{status:503});
      const origin=(process.env.NEXT_PUBLIC_BUILDPULSE_ORIGIN??req.nextUrl.origin).replace(/\/$/,"");
      const cents=Math.round(Number(order.amount_usd)*100);
      if(!Number.isSafeInteger(cents)||cents<=0)return NextResponse.json({error:"Invalid order amount"},{status:409});
      const form=new URLSearchParams();
      form.set("mode","payment");
      form.set("success_url",`${origin}/advertiser?payment=success&order=${order.id}&session_id={CHECKOUT_SESSION_ID}`);
      form.set("cancel_url",`${origin}/advertiser?payment=cancelled&order=${order.id}`);
      form.set("client_reference_id",order.id);
      if(profile.billing_email||user.email)form.set("customer_email",profile.billing_email||user.email||"");
      form.set("line_items[0][quantity]","1");
      form.set("line_items[0][price_data][currency]","usd");
      form.set("line_items[0][price_data][unit_amount]",String(cents));
      form.set("line_items[0][price_data][product_data][name]",`BuildPulse advertising — ${invoice.invoice_number}`);
      form.set("line_items[0][price_data][product_data][description]","Advertising placement subject to BuildPulse review and publication controls.");
      form.set("metadata[buildpulse_order_id]",order.id);
      form.set("metadata[buildpulse_invoice_number]",invoice.invoice_number);
      form.set("payment_intent_data[metadata][buildpulse_order_id]",order.id);
      form.set("payment_intent_data[metadata][buildpulse_invoice_number]",invoice.invoice_number);
      form.set("invoice_creation[enabled]","true");
      form.set("invoice_creation[invoice_data][description]",`BuildPulse advertising invoice ${invoice.invoice_number} — issued by ${buildPulseInvoiceIssuer.name}`);

      const stripe=await fetch("https://api.stripe.com/v1/checkout/sessions",{
        method:"POST",
        headers:{
          Authorization:`Bearer ${secret}`,
          "Content-Type":"application/x-www-form-urlencoded",
          "Idempotency-Key":`buildpulse-${order.id}-stripe`
        },
        body:form
      });
      const session=await stripe.json() as {id?:string;url?:string;error?:{message?:string}};
      if(!stripe.ok||!session.id||!session.url)return NextResponse.json({error:session.error?.message??"Stripe Checkout could not be created"},{status:502});
      const now=new Date().toISOString();
      await Promise.all([
        admin.from("buildpulse_ad_orders").update({status:"awaiting_payment",payment_method:"stripe",payment_provider:"stripe",payment_reference:session.id,updated_at:now}).eq("id",order.id).in("status",["draft","awaiting_payment"]),
        admin.from("buildpulse_billing_invoices").update({payment_method:"stripe",payment_reference:session.id,updated_at:now}).eq("order_id",order.id)
      ]);
      return NextResponse.json({ok:true,method:"stripe",checkoutUrl:session.url,sessionId:session.id,invoice});
    }

    const rail=getCryptoRail(parsed.data.method);
    if(!rail)return NextResponse.json({error:`${parsed.data.method} payment is not configured`},{status:503});
    const rate=await fetchUsdSpot(rail.asset);
    const expected=quoteAmount(Number(order.amount_usd),rate,rail.decimals);
    const now=new Date(),expires=new Date(now.getTime()+30*60000);
    await admin.from("buildpulse_ad_payment_quotes").update({state:"cancelled"}).eq("order_id",order.id).in("state",["open","observed"]);
    const {data:quote,error:quoteError}=await admin.from("buildpulse_ad_payment_quotes").insert({
      order_id:order.id,asset:rail.asset,network:rail.network,expected_amount:expected,destination:rail.destination,
      memo:rail.memo??null,usd_amount:order.amount_usd,rate_usd:rate,quoted_at:now.toISOString(),expires_at:expires.toISOString(),
      required_confirmations:rail.requiredConfirmations,state:"open"
    }).select("id,asset,network,expected_amount,destination,memo,rate_usd,expires_at,required_confirmations,state").single();
    if(quoteError||!quote)return NextResponse.json({error:"Crypto quote could not be created"},{status:500});
    await Promise.all([
      admin.from("buildpulse_ad_orders").update({
        status:"awaiting_payment",payment_method:rail.asset,payment_provider:"crypto",
        crypto_asset:rail.asset,crypto_network:rail.network,payment_address:rail.destination,
        expected_crypto_amount:expected,payment_reference:quote.id,updated_at:now.toISOString()
      }).eq("id",order.id).in("status",["draft","awaiting_payment"]),
      admin.from("buildpulse_billing_invoices").update({payment_method:rail.asset,payment_reference:quote.id,updated_at:now.toISOString()}).eq("order_id",order.id)
    ]);
    return NextResponse.json({ok:true,method:rail.asset,quote,invoice});
  }catch(error){
    const message=error instanceof Error?error.message:"payment_initialization_failed";
    return NextResponse.json({error:message},{status:500});
  }
}
