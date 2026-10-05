import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json"
};

const ISSUER={
  name:"TVK LABS & TECHNOLOGIES LTD",
  companyNumber:"16481808",
  registeredOffice:"Office 23, Unit 5, 399-405 Oxford Street, London, United Kingdom, W1C 2BU"
};

type Asset="ETH"|"BTC"|"USDC"|"USDT"|"XRP"|"SOL"|"BNB"|"POL"|"TRX"|"ADA"|"SUI"|"AVAX";
type Rail={id:string;asset:Asset;network:string;destination:string;memo?:string;decimals:number;requiredConfirmations:number;tokenContract?:string};
const RELEASE_DESTINATIONS:Record<string,string>={
  BUILDPULSE_ETH_ADDRESS:"0xc3cF4a0E1b2c569175f2e68614Aa1C0a2b687aeB",
  BUILDPULSE_ETH_BASE_ADDRESS:"0xc3cF4a0E1b2c569175f2e68614Aa1C0a2b687aeB",
  BUILDPULSE_BTC_ADDRESS:"bc1qlphfzhrpsr59afyy38fpee798zmlsr48fyd3nq",
  BUILDPULSE_USDC_ETH_ADDRESS:"0xc3cF4a0E1b2c569175f2e68614Aa1C0a2b687aeB",
  BUILDPULSE_USDC_BASE_ADDRESS:"0xc3cF4a0E1b2c569175f2e68614Aa1C0a2b687aeB",
  BUILDPULSE_USDT_ETH_ADDRESS:"0xc3cF4a0E1b2c569175f2e68614Aa1C0a2b687aeB",
  BUILDPULSE_XRP_ADDRESS:"rajoMTNgCQkKysSYR2o36JQsJpwqioVvri",
  BUILDPULSE_XRP_DESTINATION_TAG:"1234"
};
function optionalEnv(name:string){return Deno.env.get(name)?.trim()||RELEASE_DESTINATIONS[name]||undefined}
type RailDefinition=Omit<Rail,"destination"|"memo">&{destinationEnv:string;memoEnv?:string};
const RAIL_DEFINITIONS:Record<string,RailDefinition>={
  "ETH:ETHEREUM":{id:"ETH:ETHEREUM",asset:"ETH",network:"Ethereum",destinationEnv:"BUILDPULSE_ETH_ADDRESS",decimals:18,requiredConfirmations:12},
  "ETH:BASE":{id:"ETH:BASE",asset:"ETH",network:"Base",destinationEnv:"BUILDPULSE_ETH_BASE_ADDRESS",decimals:18,requiredConfirmations:20},
  "BTC:BITCOIN":{id:"BTC:BITCOIN",asset:"BTC",network:"Bitcoin",destinationEnv:"BUILDPULSE_BTC_ADDRESS",decimals:8,requiredConfirmations:3},
  "USDC:ETHEREUM":{id:"USDC:ETHEREUM",asset:"USDC",network:"Ethereum",destinationEnv:"BUILDPULSE_USDC_ETH_ADDRESS",decimals:6,requiredConfirmations:12,tokenContract:"0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"},
  "USDC:BASE":{id:"USDC:BASE",asset:"USDC",network:"Base",destinationEnv:"BUILDPULSE_USDC_BASE_ADDRESS",decimals:6,requiredConfirmations:20,tokenContract:"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"},
  "USDT:ETHEREUM":{id:"USDT:ETHEREUM",asset:"USDT",network:"Ethereum",destinationEnv:"BUILDPULSE_USDT_ETH_ADDRESS",decimals:6,requiredConfirmations:12,tokenContract:"0xdAC17F958D2ee523a2206206994597C13D831ec7"},
  "USDT:BASE":{id:"USDT:BASE",asset:"USDT",network:"Base",destinationEnv:"BUILDPULSE_USDT_BASE_ADDRESS",decimals:6,requiredConfirmations:20,tokenContract:"0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"},
  "XRP:XRPL":{id:"XRP:XRPL",asset:"XRP",network:"XRPL",destinationEnv:"BUILDPULSE_XRP_ADDRESS",memoEnv:"BUILDPULSE_XRP_DESTINATION_TAG",decimals:6,requiredConfirmations:1},
  "SOL:SOLANA":{id:"SOL:SOLANA",asset:"SOL",network:"Solana",destinationEnv:"BUILDPULSE_SOL_ADDRESS",decimals:9,requiredConfirmations:1},
  "BNB:BNB CHAIN":{id:"BNB:BNB CHAIN",asset:"BNB",network:"BNB Chain",destinationEnv:"BUILDPULSE_BNB_ADDRESS",decimals:18,requiredConfirmations:15},
  "POL:POLYGON":{id:"POL:POLYGON",asset:"POL",network:"Polygon",destinationEnv:"BUILDPULSE_POL_ADDRESS",decimals:18,requiredConfirmations:64},
  "TRX:TRON":{id:"TRX:TRON",asset:"TRX",network:"TRON",destinationEnv:"BUILDPULSE_TRX_ADDRESS",decimals:6,requiredConfirmations:20},
  "ADA:CARDANO":{id:"ADA:CARDANO",asset:"ADA",network:"Cardano",destinationEnv:"BUILDPULSE_ADA_ADDRESS",decimals:6,requiredConfirmations:15},
  "SUI:SUI":{id:"SUI:SUI",asset:"SUI",network:"Sui",destinationEnv:"BUILDPULSE_SUI_ADDRESS",decimals:9,requiredConfirmations:1},
  "AVAX:AVALANCHE C-CHAIN":{id:"AVAX:AVALANCHE C-CHAIN",asset:"AVAX",network:"Avalanche C-Chain",destinationEnv:"BUILDPULSE_AVAX_ADDRESS",decimals:18,requiredConfirmations:12}
};
function materializeRail(def:RailDefinition):Rail{
  const destination=optionalEnv(def.destinationEnv);
  if(!destination)throw new Error(`missing_payment_config:${def.destinationEnv}`);
  const {destinationEnv,memoEnv,...rail}=def;
  return {...rail,destination,memo:memoEnv?optionalEnv(memoEnv):undefined};
}
function railFor(asset:Asset,networkRaw?:string){
  const network=String(networkRaw||"").trim().toUpperCase();
  if(network){const exact=RAIL_DEFINITIONS[`${asset}:${network}`];if(exact)return materializeRail(exact);throw new Error("unsupported_network")}
  const matches=Object.values(RAIL_DEFINITIONS).filter(r=>r.asset===asset);
  if(matches.length===1)return materializeRail(matches[0]);
  throw new Error("network_required");
}
const TRANSFER_TOPIC="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function reply(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:cors})}
async function invoiceNumber(admin:any,orderId:string,issuedAt:string){
  const {data:existing,error:existingError}=await admin.from("buildpulse_billing_invoices").select("invoice_number").eq("order_id",orderId).maybeSingle();
  if(existingError)throw new Error("invoice_lookup_failed");
  if(existing?.invoice_number)return existing.invoice_number;
  const {data:entity,error:entityError}=await admin.from("buildpulse_accounting_entities").select("id").eq("is_default",true).maybeSingle();
  if(entityError||!entity)throw new Error("accounting_entity_missing");
  const {data:number,error:numberError}=await admin.rpc("buildpulse_next_document_number",{p_entity_id:entity.id,p_document_type:"invoice",p_issued_at:issuedAt});
  if(numberError||!number)throw new Error("invoice_number_allocation_failed");
  return String(number);
}
function decimalToAtomic(value:string|number,decimals:number){
  const raw=String(value).trim();
  if(!/^\d+(?:\.\d+)?$/.test(raw))throw new Error("invalid_decimal_amount");
  const [whole,frac=""]=raw.split(".");
  const fractional=(frac+"0".repeat(decimals)).slice(0,decimals);
  return BigInt(whole)*10n**BigInt(decimals)+BigInt(fractional||"0");
}
function atomicToDecimal(value:bigint,decimals:number){
  const base=10n**BigInt(decimals),whole=value/base,frac=(value%base).toString().padStart(decimals,"0").replace(/0+$/,"");
  return frac?`${whole}.${frac}`:whole.toString();
}
function ceilQuote(usd:number,rate:number,decimals:number){
  const factor=10**Math.min(decimals,12);
  return Math.ceil((usd/rate)*factor)/factor;
}
function withinQuoteWindow(txMs:number,quotedAt:string,expiresAt:string){
  const start=Date.parse(quotedAt)-60_000,end=Date.parse(expiresAt)+60_000;
  return Number.isFinite(txMs)&&txMs>=start&&txMs<=end;
}
async function fetchJson(url:string,init?:RequestInit){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10_000);
  try{
    const res=await fetch(url,{...init,signal:controller.signal});
    if(!res.ok)throw new Error(`upstream_${res.status}`);
    return await res.json();
  }finally{clearTimeout(timer)}
}
async function evmRpc(url:string,method:string,params:unknown[]){
  const body=await fetchJson(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});
  if(body?.error)throw new Error(String(body.error?.message||"rpc_error"));
  return body?.result;
}
function topicForAddress(address:string){return "0x"+address.toLowerCase().replace(/^0x/,"").padStart(64,"0")}
function normalizeAddress(address:string|null|undefined){return (address||"").toLowerCase()}

async function issueQuote(admin:any,user:any,orderId:string,asset:Asset,network?:string){
  const rail=railFor(asset,network);
  const [{data:order,error:orderError},{data:profile,error:profileError}]=await Promise.all([
    admin.from("buildpulse_ad_orders").select("id,user_id,status,amount_usd,created_at").eq("id",orderId).eq("user_id",user.id).maybeSingle(),
    admin.from("buildpulse_advertiser_profiles").select("company_name,billing_email,status,customer_type,billing_address_line1,billing_address_line2,billing_city,billing_region,billing_postal_code,billing_country_code,tax_id,tax_id_type,tax_id_validation_status").eq("user_id",user.id).maybeSingle()
  ]);
  if(orderError||!order)throw new Error("order_not_found");
  if(profileError||!profile||profile.status!=="active")throw new Error("active_advertiser_profile_required");
  if(!["draft","awaiting_payment","payment_detected"].includes(order.status))throw new Error("order_not_payable");

  const price=await fetchJson(`https://api.coinbase.com/v2/prices/${asset}-USD/spot`,{headers:{"Accept":"application/json"}});
  const rate=Number(price?.data?.amount);
  if(!Number.isFinite(rate)||rate<=0)throw new Error("market_rate_unavailable");
  const usd=Number(order.amount_usd);
  if(!Number.isFinite(usd)||usd<=0)throw new Error("invalid_order_amount");
  const expected=ceilQuote(usd,rate,rail.decimals);
  const now=new Date(),expires=new Date(now.getTime()+30*60_000);

  const {error:cancelError}=await admin.from("buildpulse_ad_payment_quotes").update({state:"cancelled"}).eq("order_id",order.id).in("state",["open","observed"]);
  if(cancelError)throw cancelError;

  const {data:quote,error:quoteError}=await admin.from("buildpulse_ad_payment_quotes").insert({
    order_id:order.id,asset:rail.asset,network:rail.network,expected_amount:expected,destination:rail.destination,memo:rail.memo??null,
    usd_amount:usd,rate_usd:rate,quoted_at:now.toISOString(),expires_at:expires.toISOString(),required_confirmations:rail.requiredConfirmations,state:"open"
  }).select("id,asset,network,expected_amount,destination,memo,rate_usd,quoted_at,expires_at,required_confirmations,state").single();
  if(quoteError||!quote)throw new Error("quote_persistence_failed");

  const invNo=await invoiceNumber(admin,order.id,now.toISOString());
  const {data:invoice,error:invoiceError}=await admin.from("buildpulse_billing_invoices").upsert({
    order_id:order.id,user_id:user.id,invoice_number:invNo,issuer_name:ISSUER.name,issuer_company_number:ISSUER.companyNumber,
    issuer_registered_office:ISSUER.registeredOffice,billing_company:profile.company_name??null,billing_email:profile.billing_email??user.email??null,
    customer_type:profile.customer_type??null,billing_address_line1:profile.billing_address_line1??null,billing_address_line2:profile.billing_address_line2??null,
    billing_city:profile.billing_city??null,billing_region:profile.billing_region??null,billing_postal_code:profile.billing_postal_code??null,billing_country_code:profile.billing_country_code??null,
    tax_id:profile.tax_id??null,tax_id_type:profile.tax_id_type??null,tax_id_validation_status:profile.tax_id_validation_status??"unverified",
    amount_usd:usd,currency:"USD",payment_method:asset,payment_reference:quote.id,status:"open",paid_at:null,updated_at:now.toISOString()
  },{onConflict:"order_id"}).select("invoice_number,status,amount_usd,currency,issuer_name,issuer_company_number,issuer_registered_office,billing_company,billing_email,payment_method").single();
  if(invoiceError||!invoice)throw new Error("invoice_persistence_failed");

  const {error:updateError}=await admin.from("buildpulse_ad_orders").update({
    status:"awaiting_payment",payment_method:asset,payment_provider:"crypto",crypto_asset:asset,crypto_network:rail.network,
    payment_address:rail.destination,expected_crypto_amount:expected,payment_reference:quote.id,paid_tx_hash:null,paid_at:null,updated_at:now.toISOString()
  }).eq("id",order.id).eq("user_id",user.id).in("status",["draft","awaiting_payment","payment_detected"]);
  if(updateError)throw new Error("order_transition_failed");

  return {quote,invoice};
}

async function issueContributorQuote(admin:any,user:any,submissionId:string,asset:Asset,network?:string){
  const rail=railFor(asset,network);
  const {data:submission,error}=await admin.from("buildpulse_contributor_submissions").select("id,user_id,status,payment_status,fee_usd").eq("id",submissionId).eq("user_id",user.id).maybeSingle();
  if(error||!submission)throw new Error("submission_not_found");
  if(!["draft","payment_pending"].includes(submission.status)||!["unpaid","pending"].includes(submission.payment_status))throw new Error("submission_not_payable");
  const usd=Number(submission.fee_usd);if(Math.round(usd*100)!==14900)throw new Error("fee_mismatch");
  const price=await fetchJson(`https://api.coinbase.com/v2/prices/${asset}-USD/spot`,{headers:{"Accept":"application/json"}});
  const rate=Number(price?.data?.amount);if(!Number.isFinite(rate)||rate<=0)throw new Error("market_rate_unavailable");
  const expected=ceilQuote(usd,rate,rail.decimals),now=new Date(),expires=new Date(now.getTime()+30*60_000);
  await admin.from("buildpulse_contributor_payment_quotes").update({state:"cancelled"}).eq("submission_id",submission.id).in("state",["open","observed"]);
  const {data:quote,error:qe}=await admin.from("buildpulse_contributor_payment_quotes").insert({submission_id:submission.id,asset:rail.asset,network:rail.network,expected_amount:expected,destination:rail.destination,memo:rail.memo??null,usd_amount:usd,rate_usd:rate,quoted_at:now.toISOString(),expires_at:expires.toISOString(),required_confirmations:rail.requiredConfirmations,state:"open"}).select("id,asset,network,expected_amount,destination,memo,rate_usd,quoted_at,expires_at,required_confirmations,state").single();
  if(qe||!quote)throw new Error("quote_persistence_failed");
  await admin.from("buildpulse_contributor_submissions").update({status:"payment_pending",payment_status:"pending",updated_at:now.toISOString()}).eq("id",submission.id).eq("user_id",user.id);
  return {quote};
}
async function verifyContributorClaim(admin:any,user:any,submissionId:string,txHashRaw:string){
  const txHash=txHashRaw.trim();
  const {data:submission,error}=await admin.from("buildpulse_contributor_submissions").select("id,user_id,status,payment_status").eq("id",submissionId).eq("user_id",user.id).maybeSingle();
  if(error||!submission)throw new Error("submission_not_found");
  if(!["draft","payment_pending","submitted"].includes(submission.status))throw new Error("submission_not_verifiable");
  const {data:quote,error:qe}=await admin.from("buildpulse_contributor_payment_quotes").select("id,asset,network,expected_amount,destination,memo,rate_usd,usd_amount,quoted_at,expires_at,required_confirmations,state").eq("submission_id",submission.id).in("state",["open","observed","confirmed"]).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(qe||!quote)throw new Error("payment_quote_not_found");
  const asset=String(quote.asset).toUpperCase() as Asset,rail=railFor(asset,String(quote.network));
  if(normalizeAddress(rail.destination)!==normalizeAddress(String(quote.destination)))throw new Error("payment_destination_mismatch");
  assertSupportedVerifier(asset);validateTransactionHash(asset,txHash);
  const verified=await verifyRailTransaction(asset,rail,quote,txHash);
  if(verified.actual<decimalToAtomic(quote.expected_amount,rail.decimals))throw new Error("payment_underpaid");
  if(verified.txTimeMs&&!withinQuoteWindow(verified.txTimeMs,quote.quoted_at,quote.expires_at))throw new Error("transaction_outside_quote_window");
  if(verified.state!=="confirmed"){await admin.from("buildpulse_contributor_payment_quotes").update({state:"observed"}).eq("id",quote.id).eq("state","open");return {state:"confirming",confirmations:verified.confirmations,requiredConfirmations:rail.requiredConfirmations}}
  const actualAmount=atomicToDecimal(verified.actual,rail.decimals);
  const {data:settled,error:se}=await admin.rpc("buildpulse_finalize_contributor_crypto_payment",{p_quote_id:quote.id,p_tx_hash:txHash,p_observed_amount:actualAmount,p_confirmations:verified.confirmations,p_metadata:{verified_at:new Date().toISOString()}});
  if(se)throw new Error(se.message||"crypto_settlement_failed");
  const {error:evidenceError}=await admin.rpc("buildpulse_record_service_crypto_evidence",{p_service_type:"contributor_review",p_service_reference_id:submission.id,p_user_id:user.id,p_asset:asset,p_network:rail.network,p_tx_hash:txHash,p_destination:quote.destination,p_expected:Number(quote.expected_amount),p_observed:actualAmount,p_rate:Number((quote as any).rate_usd||0),p_gross:149,p_confirmations:verified.confirmations,p_evidence:{quote_id:quote.id,verified_at:new Date().toISOString()}});if(evidenceError)throw new Error("accounting_evidence_persistence_failed");
  return {state:"confirmed",confirmations:verified.confirmations,requiredConfirmations:rail.requiredConfirmations,actualAmount,settled};
}

async function issueSubscriptionQuote(admin:any,user:any,planCode:string,billingInterval:string,asset:Asset,network?:string){
  if(!["month","year"].includes(billingInterval))throw new Error("invalid_billing_interval");
  const rail=railFor(asset,network);
  const {data:plan,error}=await admin.from("buildpulse_subscription_plans").select("code,monthly_usd,annual_usd,active").eq("code",planCode).eq("active",true).maybeSingle();
  if(error||!plan)throw new Error("subscription_plan_not_found");
  const usd=Number(billingInterval==="year"?plan.annual_usd:plan.monthly_usd);if(!Number.isFinite(usd)||usd<=0)throw new Error("invalid_plan_amount");
  const price=await fetchJson(`https://api.coinbase.com/v2/prices/${asset}-USD/spot`,{headers:{"Accept":"application/json"}});
  const rate=Number(price?.data?.amount);if(!Number.isFinite(rate)||rate<=0)throw new Error("market_rate_unavailable");
  const expected=ceilQuote(usd,rate,rail.decimals),now=new Date(),expires=new Date(now.getTime()+30*60_000);
  await admin.from("buildpulse_subscription_crypto_payments").update({state:"cancelled"}).eq("user_id",user.id).in("state",["open","observed"]);
  const {data:payment,error:pe}=await admin.from("buildpulse_subscription_crypto_payments").insert({user_id:user.id,email:user.email??"",plan_code:plan.code,billing_interval:billingInterval,usd_amount:usd,asset:rail.asset,network:rail.network,expected_amount:expected,destination:rail.destination,memo:rail.memo??null,rate_usd:rate,quoted_at:now.toISOString(),expires_at:expires.toISOString(),required_confirmations:rail.requiredConfirmations,state:"open"}).select("id,plan_code,billing_interval,usd_amount,asset,network,expected_amount,destination,memo,rate_usd,quoted_at,expires_at,required_confirmations,state").single();
  if(pe||!payment)throw new Error("quote_persistence_failed");return {payment};
}
async function verifySubscriptionClaim(admin:any,user:any,paymentId:string,txHashRaw:string){
  const txHash=txHashRaw.trim();
  const {data:payment,error}=await admin.from("buildpulse_subscription_crypto_payments").select("*").eq("id",paymentId).eq("user_id",user.id).maybeSingle();
  if(error||!payment)throw new Error("payment_not_found");if(!["open","observed","confirmed"].includes(payment.state))throw new Error("payment_not_verifiable");
  const asset=String(payment.asset).toUpperCase() as Asset,rail=railFor(asset,String(payment.network));
  if(normalizeAddress(rail.destination)!==normalizeAddress(String(payment.destination)))throw new Error("payment_destination_mismatch");
  assertSupportedVerifier(asset);validateTransactionHash(asset,txHash);
  const verified=await verifyRailTransaction(asset,rail,payment,txHash);
  if(verified.actual<decimalToAtomic(payment.expected_amount,rail.decimals))throw new Error("payment_underpaid");
  if(verified.txTimeMs&&!withinQuoteWindow(verified.txTimeMs,payment.quoted_at,payment.expires_at))throw new Error("transaction_outside_quote_window");
  if(verified.state!=="confirmed"){await admin.from("buildpulse_subscription_crypto_payments").update({state:"observed",tx_hash:txHash}).eq("id",payment.id).eq("state","open");return {state:"confirming",paymentId:payment.id,confirmations:verified.confirmations,requiredConfirmations:rail.requiredConfirmations}}
  const {data:settled,error:se}=await admin.rpc("buildpulse_finalize_subscription_crypto_payment",{p_payment_id:payment.id,p_tx_hash:txHash,p_confirmations:verified.confirmations});
  if(se)throw new Error(se.message||"crypto_settlement_failed");const observed=atomicToDecimal(verified.actual,rail.decimals);const {error:evidenceError}=await admin.rpc("buildpulse_record_service_crypto_evidence",{p_service_type:"intelligence_subscription",p_service_reference_id:payment.id,p_user_id:user.id,p_asset:asset,p_network:rail.network,p_tx_hash:txHash,p_destination:payment.destination,p_expected:Number(payment.expected_amount),p_observed:observed,p_rate:Number(payment.rate_usd),p_gross:Number(payment.usd_amount),p_confirmations:verified.confirmations,p_evidence:{plan_code:payment.plan_code,billing_interval:payment.billing_interval,verified_at:new Date().toISOString()}});if(evidenceError)throw new Error("accounting_evidence_persistence_failed");return {state:"confirmed",paymentId:payment.id,confirmations:verified.confirmations,requiredConfirmations:rail.requiredConfirmations,settled};
}

async function prepareStripe(admin:any,user:any,orderId:string){
  const [{data:order,error:orderError},{data:profile,error:profileError}]=await Promise.all([
    admin.from("buildpulse_ad_orders").select("id,user_id,product_id,status,amount_usd,created_at").eq("id",orderId).eq("user_id",user.id).maybeSingle(),
    admin.from("buildpulse_advertiser_profiles").select("company_name,billing_email,status,customer_type,billing_address_line1,billing_address_line2,billing_city,billing_region,billing_postal_code,billing_country_code,tax_id,tax_id_type,tax_id_validation_status").eq("user_id",user.id).maybeSingle()
  ]);
  if(orderError||!order)throw new Error("order_not_found");
  if(profileError||!profile||profile.status!=="active")throw new Error("active_advertiser_profile_required");
  if(!["draft","awaiting_payment","payment_detected"].includes(order.status))throw new Error("order_not_payable");
  const {data:product,error:productError}=await admin.from("buildpulse_ad_products")
    .select("stripe_payment_link_id,stripe_payment_link_url,price_usd,active").eq("id",order.product_id).eq("active",true).maybeSingle();
  if(productError||!product?.stripe_payment_link_id||!product?.stripe_payment_link_url)throw new Error("stripe_payment_link_unavailable");
  if(Math.round(Number(product.price_usd)*100)!==Math.round(Number(order.amount_usd)*100))throw new Error("order_price_mismatch");

  const now=new Date().toISOString(),invNo=await invoiceNumber(admin,order.id,new Date().toISOString());
  const {data:invoice,error:invoiceError}=await admin.from("buildpulse_billing_invoices").upsert({
    order_id:order.id,user_id:user.id,invoice_number:invNo,issuer_name:ISSUER.name,issuer_company_number:ISSUER.companyNumber,
    issuer_registered_office:ISSUER.registeredOffice,billing_company:profile.company_name??null,billing_email:profile.billing_email??user.email??null,
    customer_type:profile.customer_type??null,billing_address_line1:profile.billing_address_line1??null,billing_address_line2:profile.billing_address_line2??null,
    billing_city:profile.billing_city??null,billing_region:profile.billing_region??null,billing_postal_code:profile.billing_postal_code??null,billing_country_code:profile.billing_country_code??null,
    tax_id:profile.tax_id??null,tax_id_type:profile.tax_id_type??null,tax_id_validation_status:profile.tax_id_validation_status??"unverified",
    amount_usd:order.amount_usd,currency:"USD",payment_method:"stripe",payment_reference:product.stripe_payment_link_id,status:"open",paid_at:null,updated_at:now
  },{onConflict:"order_id"}).select("invoice_number,status,amount_usd,currency,issuer_name,issuer_company_number,issuer_registered_office,billing_company,billing_email,payment_method").single();
  if(invoiceError||!invoice)throw new Error("invoice_persistence_failed");

  const {error:updateError}=await admin.from("buildpulse_ad_orders").update({
    status:"awaiting_payment",payment_method:"stripe",payment_provider:"stripe",payment_reference:product.stripe_payment_link_id,
    paid_tx_hash:null,paid_at:null,updated_at:now
  }).eq("id",order.id).eq("user_id",user.id).in("status",["draft","awaiting_payment","payment_detected"]);
  if(updateError)throw new Error("order_transition_failed");

  const url=new URL(product.stripe_payment_link_url);
  url.searchParams.set("client_reference_id",order.id);
  const email=profile.billing_email||user.email;
  if(email)url.searchParams.set("prefilled_email",email);
  return {checkoutUrl:url.toString(),paymentLinkId:product.stripe_payment_link_id,invoice};
}

async function verifyEvm(asset:Asset,rail:Rail,quote:any,txHash:string){
  const rpc=rail.network==="Base"?(optionalEnv("BUILDPULSE_BASE_RPC_URL")??"https://base-rpc.publicnode.com")
    :rail.network==="Ethereum"?(optionalEnv("BUILDPULSE_ETH_RPC_URL")??"https://ethereum-rpc.publicnode.com")
    :rail.network==="BNB Chain"?optionalEnv("BUILDPULSE_BNB_RPC_URL")
    :rail.network==="Polygon"?optionalEnv("BUILDPULSE_POL_RPC_URL")
    :rail.network==="Avalanche C-Chain"?optionalEnv("BUILDPULSE_AVAX_RPC_URL")
    :undefined;
  if(!rpc)throw new Error("evm_rpc_not_configured");
  const receipt=await evmRpc(rpc,"eth_getTransactionReceipt",[txHash]);
  if(!receipt)return {state:"pending",confirmations:0,actual:0n,txTimeMs:0};
  if(receipt.status!=="0x1")throw new Error("transaction_failed");
  const blockHex=receipt.blockNumber;
  if(!blockHex)throw new Error("transaction_unconfirmed");
  const [headHex,block]=await Promise.all([
    evmRpc(rpc,"eth_blockNumber",[]),
    evmRpc(rpc,"eth_getBlockByNumber",[blockHex,false])
  ]);
  const blockNo=BigInt(blockHex),head=BigInt(headHex),confirmations=Number(head>=blockNo?head-blockNo+1n:0n);
  const txTimeMs=Number(BigInt(block?.timestamp||"0x0"))*1000;
  let actual=0n;
  if(!rail.tokenContract){
    const tx=await evmRpc(rpc,"eth_getTransactionByHash",[txHash]);
    if(!tx)throw new Error("transaction_not_found");
    if(normalizeAddress(tx.to)!==normalizeAddress(rail.destination))throw new Error("destination_mismatch");
    actual=BigInt(tx.value||"0x0");
  }else{
    const contract=rail.tokenContract;
    if(!contract)throw new Error("unsupported_token");
    const wantedTopic=topicForAddress(rail.destination);
    for(const log of receipt.logs??[]){
      if(normalizeAddress(log.address)!==normalizeAddress(contract))continue;
      if(String(log.topics?.[0]||"").toLowerCase()!==TRANSFER_TOPIC)continue;
      if(String(log.topics?.[2]||"").toLowerCase()!==wantedTopic)continue;
      actual+=BigInt(log.data||"0x0");
    }
  }
  return {state:confirmations>=rail.requiredConfirmations?"confirmed":"confirming",confirmations,actual,txTimeMs};
}

async function verifyBitcoin(rail:Rail,txHash:string){
  const tx=await fetchJson(`https://blockstream.info/api/tx/${txHash}`);
  let actual=0n;
  for(const out of tx?.vout??[])if(out?.scriptpubkey_address===rail.destination)actual+=BigInt(out?.value??0);
  const confirmed=Boolean(tx?.status?.confirmed);
  if(!confirmed)return {state:"confirming",confirmations:0,actual,txTimeMs:0};
  const tipText=await (await fetch("https://blockstream.info/api/blocks/tip/height",{cache:"no-store"})).text();
  const tip=Number(tipText),height=Number(tx.status.block_height);
  const confirmations=Number.isFinite(tip)&&Number.isFinite(height)?Math.max(0,tip-height+1):0;
  const txTimeMs=Number(tx.status.block_time??0)*1000;
  return {state:confirmations>=rail.requiredConfirmations?"confirmed":"confirming",confirmations,actual,txTimeMs};
}

const EVM_VERIFIED_ASSETS=new Set<Asset>(["ETH","USDC","USDT","BNB","POL","AVAX"]);
function assertSupportedVerifier(asset:Asset){if(!EVM_VERIFIED_ASSETS.has(asset)&&asset!=="BTC"&&asset!=="XRP")throw new Error("verifier_not_implemented")}
function validateTransactionHash(asset:Asset,txHash:string){if(EVM_VERIFIED_ASSETS.has(asset)){if(!/^0x[0-9a-fA-F]{64}$/.test(txHash))throw new Error("invalid_transaction_hash");return}if(!/^[0-9a-fA-F]{64}$/.test(txHash))throw new Error("invalid_transaction_hash")}
async function verifyRailTransaction(asset:Asset,rail:Rail,evidence:any,txHash:string){if(EVM_VERIFIED_ASSETS.has(asset))return verifyEvm(asset,rail,evidence,txHash);if(asset==="BTC")return verifyBitcoin(rail,txHash);if(asset==="XRP")return verifyXrp(rail,txHash);throw new Error("verifier_not_implemented")}

async function verifyXrp(rail:Rail,txHash:string){
  const body=await fetchJson("https://xrplcluster.com/",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({method:"tx",params:[{transaction:txHash,binary:false,api_version:1}]})
  });
  const tx=body?.result;
  if(!tx||tx?.error)throw new Error("transaction_not_found");
  if(!tx.validated)return {state:"confirming",confirmations:0,actual:0n,txTimeMs:0};
  if(tx?.meta?.TransactionResult!=="tesSUCCESS")throw new Error("transaction_failed");
  if(tx.TransactionType!=="Payment")throw new Error("not_xrp_payment");
  if(tx.Destination!==rail.destination)throw new Error("destination_mismatch");
  if(String(tx.DestinationTag??"")!==String(rail.memo??""))throw new Error("destination_tag_mismatch");
  if(typeof tx.Amount!=="string"||!/^[0-9]+$/.test(tx.Amount))throw new Error("non_xrp_amount");
  const txTimeMs=(Number(tx.date??0)+946684800)*1000;
  return {state:"confirmed",confirmations:1,actual:BigInt(tx.Amount),txTimeMs};
}

async function verifyClaim(admin:any,user:any,orderId:string,txHashRaw:string){
  const txHash=txHashRaw.trim();
  const {data:order,error:orderError}=await admin.from("buildpulse_ad_orders")
    .select("id,user_id,status,amount_usd").eq("id",orderId).eq("user_id",user.id).maybeSingle();
  if(orderError||!order)throw new Error("order_not_found");
  if(!["awaiting_payment","payment_detected","review"].includes(order.status))throw new Error("order_not_verifiable");

  const {data:quote,error:quoteError}=await admin.from("buildpulse_ad_payment_quotes")
    .select("id,asset,network,expected_amount,destination,memo,usd_amount,rate_usd,quoted_at,expires_at,required_confirmations,state")
    .eq("order_id",order.id).in("state",["open","observed","confirmed"]).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(quoteError||!quote)throw new Error("payment_quote_not_found");
  const asset=String(quote.asset).toUpperCase() as Asset;
  const rail=railFor(asset,String(quote.network));
  if(normalizeAddress(rail.destination)!==normalizeAddress(String(quote.destination)))throw new Error("payment_destination_mismatch");

  if(asset==="ETH"||asset==="USDC"||asset==="USDT"||asset==="BNB"||asset==="POL"||asset==="AVAX"){
    if(!/^0x[0-9a-fA-F]{64}$/.test(txHash))throw new Error("invalid_transaction_hash");
  }else if(!/^[0-9a-fA-F]{64}$/.test(txHash))throw new Error("invalid_transaction_hash");

  const eventKey=`onchain:${rail.network.toLowerCase()}:${txHash.toLowerCase()}`;
  const {data:existing}=await admin.from("buildpulse_ad_payment_events").select("order_id,state,confirmations").eq("provider_event_key",eventKey).maybeSingle();
  if(existing){
    if(existing.order_id!==order.id)throw new Error("transaction_already_used");
    return {state:existing.state,confirmations:existing.confirmations,idempotent:true};
  }

  assertSupportedVerifier(asset);validateTransactionHash(asset,txHash);
  const verified=await verifyRailTransaction(asset,rail,quote,txHash);

  const expected=decimalToAtomic(quote.expected_amount,rail.decimals);
  if(verified.actual<expected)throw new Error("payment_underpaid");
  if(verified.txTimeMs&& !withinQuoteWindow(verified.txTimeMs,quote.quoted_at,quote.expires_at))throw new Error("transaction_outside_quote_window");

  const now=new Date().toISOString();
  if(verified.state!=="confirmed"){
    await Promise.all([
      admin.from("buildpulse_ad_payment_quotes").update({state:"observed"}).eq("id",quote.id).eq("state","open"),
      admin.from("buildpulse_ad_orders").update({status:"payment_detected",paid_tx_hash:txHash,updated_at:now}).eq("id",order.id).eq("status","awaiting_payment")
    ]);
    return {state:"confirming",confirmations:verified.confirmations,requiredConfirmations:rail.requiredConfirmations};
  }

  const actualAmount=atomicToDecimal(verified.actual,rail.decimals);
  const {error:settlementError}=await admin.rpc("buildpulse_finalize_crypto_ad_payment",{
    p_order_id:order.id,p_quote_id:quote.id,p_provider_event_key:eventKey,p_tx_hash:txHash,
    p_observed_amount:actualAmount,p_confirmations:verified.confirmations,p_verified_at:new Date().toISOString()
  });
  if(settlementError)throw new Error(settlementError.message||"crypto_settlement_failed");
  return {state:"confirmed",confirmations:verified.confirmations,requiredConfirmations:rail.requiredConfirmations,actualAmount};
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return reply({ok:false,error:"method_not_allowed"},405);
  try{
    const url=Deno.env.get("SUPABASE_URL")??"";
    const anon=Deno.env.get("SUPABASE_ANON_KEY")??"";
    const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
    const authorization=req.headers.get("Authorization")??"";
    if(!url||!anon||!service)return reply({ok:false,error:"service_not_configured"},503);
    if(!authorization.startsWith("Bearer "))return reply({ok:false,error:"authentication_required"},401);
    const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error:userError}=await userClient.auth.getUser();
    if(userError||!user)return reply({ok:false,error:"authentication_required"},401);
    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const body=await req.json().catch(()=>null);
    if(!body||typeof body!=="object")return reply({ok:false,error:"invalid_request"},400);
    const action=String(body.action??"");
    if(action==="capabilities"){
      const supported=new Set(["ETH","BTC","USDC","USDT","XRP"]);
      const rails=Object.values(RAIL_DEFINITIONS).filter(def=>{
        if(!supported.has(def.asset))return false;
        if(def.asset==="USDT"&&def.network==="Base")return false;
        return Boolean(optionalEnv(def.destinationEnv));
      }).map(def=>({asset:def.asset,network:def.network,requiresMemo:Boolean(def.memoEnv&&optionalEnv(def.memoEnv))}));
      return reply({ok:true,rails});
    }
    const subscriptionPaymentId=String(body.paymentId??"");
    if(action==="subscription_quote"){const asset=String(body.asset??"").toUpperCase() as Asset;let rail:Rail;try{rail=railFor(asset,String(body.network??""))}catch(e){return reply({ok:false,error:e instanceof Error?e.message:"unsupported_network"},400)}if(!["ETH","BTC","USDC","USDT","XRP"].includes(asset)||(asset==="USDT"&&rail.network==="Base"))return reply({ok:false,error:"verification_not_enabled_for_asset"},503);return reply({ok:true,method:asset,...await issueSubscriptionQuote(admin,user,String(body.planCode??""),String(body.billingInterval??""),asset,rail.network)})}
    if(action==="subscription_verify"){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(subscriptionPaymentId))return reply({ok:false,error:"invalid_payment"},400);return reply({ok:true,...await verifySubscriptionClaim(admin,user,subscriptionPaymentId,String(body.txHash??""))})}
    const submissionId=String(body.submissionId??"");
    if(action==="contributor_quote"||action==="contributor_verify"){
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId))return reply({ok:false,error:"invalid_submission"},400);
      if(action==="contributor_quote"){const asset=String(body.asset??"").toUpperCase() as Asset;let rail:Rail;try{rail=railFor(asset,String(body.network??""))}catch(e){return reply({ok:false,error:e instanceof Error?e.message:"unsupported_network"},400)}if(!["ETH","BTC","USDC","USDT","XRP"].includes(asset)||(asset==="USDT"&&rail.network==="Base"))return reply({ok:false,error:"verification_not_enabled_for_asset"},503);return reply({ok:true,method:asset,...await issueContributorQuote(admin,user,submissionId,asset,rail.network)})}
      return reply({ok:true,...await verifyContributorClaim(admin,user,submissionId,String(body.txHash??""))});
    }
    const orderId=String(body.orderId??"");
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId))return reply({ok:false,error:"invalid_order"},400);
    if(action==="stripe"){
      const result=await prepareStripe(admin,user,orderId);
      return reply({ok:true,method:"stripe",...result});
    }
    if(action==="quote"){
      const asset=String(body.asset??"").toUpperCase() as Asset;
      let rail:Rail;try{rail=railFor(asset,String(body.network??""))}catch(e){const m=e instanceof Error?e.message:"unsupported_network";return reply({ok:false,error:m},400)}
      if(!["ETH","BTC","USDC","USDT","XRP"].includes(asset))return reply({ok:false,error:"verification_not_enabled_for_asset"},503);
      if(asset==="USDT"&&rail.network==="Base")return reply({ok:false,error:"verification_not_enabled_for_network"},503);
      const result=await issueQuote(admin,user,orderId,asset,rail.network);
      return reply({ok:true,method:asset,...result});
    }
    if(action==="verify"){
      const txHash=String(body.txHash??"");
      const result=await verifyClaim(admin,user,orderId,txHash);
      return reply({ok:true,...result});
    }
    return reply({ok:false,error:"unsupported_action"},400);
  }catch(error){
    const message=error instanceof Error?error.message:"payment_operation_failed";
    const status=["order_not_found","submission_not_found","payment_not_found","subscription_plan_not_found","payment_quote_not_found"].includes(message)?404:
      ["active_advertiser_profile_required"].includes(message)?403:
      ["order_not_payable","order_not_verifiable","submission_not_payable","submission_not_verifiable","transaction_already_used","order_price_mismatch","fee_mismatch"].includes(message)?409:
      ["network_required","unsupported_network","invalid_billing_interval","invalid_transaction_hash","payment_underpaid","transaction_outside_quote_window","destination_mismatch","destination_tag_mismatch","not_xrp_payment","non_xrp_amount","payment_rail_mismatch","payment_destination_mismatch","transaction_failed"].includes(message)?400:500;
    return reply({ok:false,error:message},status);
  }
});
