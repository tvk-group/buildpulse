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

type Asset="ETH"|"BTC"|"USDC"|"USDT"|"XRP";
type Rail={asset:Asset;network:string;destination:string;memo?:string;decimals:number;requiredConfirmations:number};
const RAILS:Record<Asset,Rail>={
  ETH:{asset:"ETH",network:"Ethereum",destination:"0x1A5a410a35d8685A0C5F58E61B3083Ea20820e0f",decimals:18,requiredConfirmations:12},
  BTC:{asset:"BTC",network:"Bitcoin",destination:"bc1q6gyckg3ya4zwhslnr3regspj8pk5anyaz50ynl",decimals:8,requiredConfirmations:3},
  USDC:{asset:"USDC",network:"Base",destination:"0x1A5a410a35d8685A0C5F58E61B3083Ea20820e0f",decimals:6,requiredConfirmations:20},
  USDT:{asset:"USDT",network:"Ethereum",destination:"0x1A5a410a35d8685A0C5F58E61B3083Ea20820e0f",decimals:6,requiredConfirmations:12},
  XRP:{asset:"XRP",network:"XRPL",destination:"rPoLiQPahRkwi9dkhiCgw98x84fQCviT7Z",memo:"1234",decimals:6,requiredConfirmations:1}
};
const ERC20:Partial<Record<Asset,string>>={
  USDC:"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  USDT:"0xdAC17F958D2ee523a2206206994597C13D831ec7"
};
const TRANSFER_TOPIC="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function reply(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:cors})}
function invoiceNumber(orderId:string,createdAt:string){return `BP-${new Date(createdAt).getUTCFullYear()}-${orderId.replaceAll("-","").slice(0,12).toUpperCase()}`}
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

async function issueQuote(admin:any,user:any,orderId:string,asset:Asset){
  const rail=RAILS[asset];
  const [{data:order,error:orderError},{data:profile,error:profileError}]=await Promise.all([
    admin.from("buildpulse_ad_orders").select("id,user_id,status,amount_usd,created_at").eq("id",orderId).eq("user_id",user.id).maybeSingle(),
    admin.from("buildpulse_advertiser_profiles").select("company_name,billing_email,status").eq("user_id",user.id).maybeSingle()
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

  const invNo=invoiceNumber(order.id,order.created_at);
  const {data:invoice,error:invoiceError}=await admin.from("buildpulse_billing_invoices").upsert({
    order_id:order.id,user_id:user.id,invoice_number:invNo,issuer_name:ISSUER.name,issuer_company_number:ISSUER.companyNumber,
    issuer_registered_office:ISSUER.registeredOffice,billing_company:profile.company_name??null,billing_email:profile.billing_email??user.email??null,
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

async function prepareStripe(admin:any,user:any,orderId:string){
  const [{data:order,error:orderError},{data:profile,error:profileError}]=await Promise.all([
    admin.from("buildpulse_ad_orders").select("id,user_id,product_id,status,amount_usd,created_at").eq("id",orderId).eq("user_id",user.id).maybeSingle(),
    admin.from("buildpulse_advertiser_profiles").select("company_name,billing_email,status").eq("user_id",user.id).maybeSingle()
  ]);
  if(orderError||!order)throw new Error("order_not_found");
  if(profileError||!profile||profile.status!=="active")throw new Error("active_advertiser_profile_required");
  if(!["draft","awaiting_payment","payment_detected"].includes(order.status))throw new Error("order_not_payable");
  const {data:product,error:productError}=await admin.from("buildpulse_ad_products")
    .select("stripe_payment_link_id,stripe_payment_link_url,price_usd,active").eq("id",order.product_id).eq("active",true).maybeSingle();
  if(productError||!product?.stripe_payment_link_id||!product?.stripe_payment_link_url)throw new Error("stripe_payment_link_unavailable");
  if(Math.round(Number(product.price_usd)*100)!==Math.round(Number(order.amount_usd)*100))throw new Error("order_price_mismatch");

  const now=new Date().toISOString(),invNo=invoiceNumber(order.id,order.created_at);
  const {data:invoice,error:invoiceError}=await admin.from("buildpulse_billing_invoices").upsert({
    order_id:order.id,user_id:user.id,invoice_number:invNo,issuer_name:ISSUER.name,issuer_company_number:ISSUER.companyNumber,
    issuer_registered_office:ISSUER.registeredOffice,billing_company:profile.company_name??null,billing_email:profile.billing_email??user.email??null,
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
  const isBase=rail.network==="Base";
  const rpc=isBase?"https://base-rpc.publicnode.com":"https://ethereum-rpc.publicnode.com";
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
  if(asset==="ETH"){
    const tx=await evmRpc(rpc,"eth_getTransactionByHash",[txHash]);
    if(!tx)throw new Error("transaction_not_found");
    if(normalizeAddress(tx.to)!==normalizeAddress(rail.destination))throw new Error("destination_mismatch");
    actual=BigInt(tx.value||"0x0");
  }else{
    const contract=ERC20[asset];
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
    .select("id,asset,network,expected_amount,destination,memo,quoted_at,expires_at,required_confirmations,state")
    .eq("order_id",order.id).in("state",["open","observed","confirmed"]).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(quoteError||!quote)throw new Error("payment_quote_not_found");
  const asset=String(quote.asset).toUpperCase() as Asset;
  const rail=RAILS[asset];
  if(!rail||rail.network.toLowerCase()!==String(quote.network).toLowerCase())throw new Error("payment_rail_mismatch");
  if(normalizeAddress(rail.destination)!==normalizeAddress(String(quote.destination)))throw new Error("payment_destination_mismatch");

  if(asset==="ETH"||asset==="USDC"||asset==="USDT"){
    if(!/^0x[0-9a-fA-F]{64}$/.test(txHash))throw new Error("invalid_transaction_hash");
  }else if(!/^[0-9a-fA-F]{64}$/.test(txHash))throw new Error("invalid_transaction_hash");

  const eventKey=`onchain:${rail.network.toLowerCase()}:${txHash.toLowerCase()}`;
  const {data:existing}=await admin.from("buildpulse_ad_payment_events").select("order_id,state,confirmations").eq("provider_event_key",eventKey).maybeSingle();
  if(existing){
    if(existing.order_id!==order.id)throw new Error("transaction_already_used");
    return {state:existing.state,confirmations:existing.confirmations,idempotent:true};
  }

  let verified;
  if(asset==="ETH"||asset==="USDC"||asset==="USDT")verified=await verifyEvm(asset,rail,quote,txHash);
  else if(asset==="BTC")verified=await verifyBitcoin(rail,txHash);
  else verified=await verifyXrp(rail,txHash);

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
  const {error:eventError}=await admin.from("buildpulse_ad_payment_events").insert({
    order_id:order.id,provider_event_key:eventKey,crypto_asset:asset,crypto_network:rail.network,tx_hash:txHash,
    observed_amount:actualAmount,confirmations:verified.confirmations,state:"confirmed",
    metadata:{provider:"buildpulse_supabase_onchain_verifier",quote_id:quote.id,onchain_verified:true,required_confirmations:rail.requiredConfirmations}
  });
  if(eventError){
    if(eventError.code==="23505")throw new Error("transaction_already_used");
    throw eventError;
  }
  await Promise.all([
    admin.from("buildpulse_ad_payment_quotes").update({state:"confirmed"}).eq("id",quote.id),
    admin.from("buildpulse_ad_orders").update({
      status:"review",paid_tx_hash:txHash,paid_at:now,payment_method:asset,payment_provider:"crypto",payment_reference:quote.id,updated_at:now
    }).eq("id",order.id).in("status",["awaiting_payment","payment_detected"]),
    admin.from("buildpulse_billing_invoices").update({
      status:"paid",paid_at:now,payment_method:asset,payment_reference:quote.id,updated_at:now,
      metadata:{tx_hash:txHash,asset,network:rail.network,amount:actualAmount,onchain_verified:true}
    }).eq("order_id",order.id)
  ]);
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
    const orderId=String(body.orderId??"");
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId))return reply({ok:false,error:"invalid_order"},400);
    if(action==="stripe"){
      const result=await prepareStripe(admin,user,orderId);
      return reply({ok:true,method:"stripe",...result});
    }
    if(action==="quote"){
      const asset=String(body.asset??"").toUpperCase() as Asset;
      if(!RAILS[asset])return reply({ok:false,error:"unsupported_asset"},400);
      const result=await issueQuote(admin,user,orderId,asset);
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
    const status=["order_not_found","payment_quote_not_found"].includes(message)?404:
      ["active_advertiser_profile_required"].includes(message)?403:
      ["order_not_payable","order_not_verifiable","transaction_already_used","order_price_mismatch"].includes(message)?409:
      ["invalid_transaction_hash","payment_underpaid","transaction_outside_quote_window","destination_mismatch","destination_tag_mismatch","not_xrp_payment","non_xrp_amount","payment_rail_mismatch","payment_destination_mismatch","transaction_failed"].includes(message)?400:500;
    return reply({ok:false,error:message},status);
  }
});
