import {NextRequest,NextResponse} from "next/server";
import {createHash} from "crypto";
import {createAdminClient} from "@/lib/supabase/admin";
import {marketQuote,fredLatest} from "@/lib/buildpulse/market-providers";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;

const sourceProduct="BuildPulse";
const marketEndpoint=()=>process.env.SOVRA_MARKET_INGEST_ENDPOINT?.trim();
const secret=()=>process.env.SOVRA_LEARNING_INGEST_SECRET?.trim();
const hash=(value:string)=>createHash("sha256").update(value).digest("hex");

function authorized(req:NextRequest){
 const cron=process.env.CRON_SECRET?.trim();
 if(!cron)return false;
 return req.headers.get("authorization")===`Bearer ${cron}`;
}
async function getJson(url:string){
 const c=new AbortController(),t=setTimeout(()=>c.abort(),8000);
 try{const r=await fetch(url,{signal:c.signal,cache:"no-store",headers:{"user-agent":"BuildPulse-SOVRA/1.0"}});if(!r.ok)throw new Error("source_"+r.status);return await r.json()}
 finally{clearTimeout(t)}
}
async function postBatch(kind:string,items:unknown[]){
 const endpoint=marketEndpoint(),key=secret();
 if(!endpoint||!key)throw new Error("sovra_market_learning_not_configured");
 if(!items.length)return {stored:true,stored_count:0};
 const r=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json","x-sovra-learning-secret":key},body:JSON.stringify({kind,items}),cache:"no-store"});
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(String(d?.error||"sovra_market_ingest_failed"));
 return d;
}

async function marketItems(){
 const items:any[]=[];
 const equities=await Promise.all([["AAPL","Apple"],["MSFT","Microsoft"],["NVDA","NVIDIA"],["SPY","S&P 500 ETF"],["QQQ","Nasdaq 100 ETF"]].map(async([symbol,label])=>{
  try{return {label,q:await marketQuote(symbol)}}catch{return null}
 }));
 for(const row of equities){if(row?.q)items.push({source_product:sourceProduct,provider:row.q.provider,asset_class:"equity",symbol:row.q.symbol,value:row.q.price,currency:row.q.currency||"USD",observed_at:row.q.timestamp,realtime:row.q.realtime,quality_status:"provider_observed",metadata:{label:row.label}})}
 try{
  const x=await getJson("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,ripple,solana,binancecoin&vs_currencies=usd&include_24hr_change=true");
  for(const [id,symbol] of [["bitcoin","BTC"],["ethereum","ETH"],["ripple","XRP"],["solana","SOL"],["binancecoin","BNB"]] as const){
   const v=Number(x?.[id]?.usd),change=Number(x?.[id]?.usd_24h_change);
   if(Number.isFinite(v)&&v>0)items.push({source_product:sourceProduct,provider:"CoinGecko",asset_class:"crypto",symbol,value:v,currency:"USD",change_pct:Number.isFinite(change)?change:null,observed_at:new Date().toISOString(),realtime:false,quality_status:"reference_observed"});
  }
 }catch{}
 try{
  const date=new Date(Date.now()-5*864e5).toISOString().slice(0,10);
  const rows=await getJson("https://api.frankfurter.dev/v2/rates?base=usd&quotes=eur,gbp,jpy,chf&from="+date);
  for(const quote of ["EUR","GBP","JPY","CHF"]){
   const a=(Array.isArray(rows)?rows:[]).filter((r:any)=>r.quote===quote).sort((x:any,y:any)=>String(x.date).localeCompare(String(y.date)));
   if(!a.length)continue;
   const raw=Number(a.at(-1).rate);if(!Number.isFinite(raw)||raw<=0)continue;
   const invert=quote==="EUR"||quote==="GBP";
   items.push({source_product:sourceProduct,provider:"Frankfurter / ECB reference rates",asset_class:"fx",symbol:invert?`${quote}/USD`:`USD/${quote}`,value:invert?1/raw:raw,currency:null,observed_at:String(a.at(-1).date)+"T00:00:00Z",realtime:false,quality_status:"official_reference"});
  }
 }catch{}
 return items;
}

async function macroItems(){
 const rows:any[]=[];
 for(const [seriesId,label] of [["FEDFUNDS","Federal Funds Rate"],["CPIAUCSL","US CPI"],["UNRATE","US Unemployment"],["GDP","US GDP"],["DGS10","US 10Y Treasury"],["DEXUSEU","USD per EUR"]] as const){
  try{const x=await fredLatest(seriesId);if(x)rows.push({source_product:sourceProduct,provider:x.provider,series_id:seriesId,label,value:x.value,period_date:x.date,source_url:`https://fred.stlouisfed.org/series/${seriesId}`,metadata:{retrieved_at:x.retrievedAt}})}catch{}
 }
 return rows;
}

async function newsItems(){
 const db=createAdminClient();if(!db)return [];
 const since=new Date(Date.now()-36*3600_000).toISOString();
 const {data}=await db.from("buildpulse_stories")
  .select("id,title,category,canonical_url,canonical_source_url,published_at,verified_at,verified_by,verification_state,editorial_score,corroboration_count,source_name")
  .eq("verification_state","verified")
  .gte("published_at",since)
  .order("published_at",{ascending:false})
  .limit(150);
 return (data??[]).map((x:any)=>({
  source_product:sourceProduct,
  source_name:String(x.source_name||"BuildPulse verified story"),
  source_url:String(x.canonical_source_url||x.canonical_url||""),
  canonical_url:String(x.canonical_url||x.canonical_source_url||""),
  title:String(x.title||"").slice(0,500),
  published_at:x.published_at,
  language:"en",
  topics:[String(x.category||"world")],
  content_hash:hash([x.id,x.title,x.canonical_url,x.published_at].join("|")),
  verification_status:"verified",
  importance:x.editorial_score==null?null:Math.max(0,Math.min(1,Number(x.editorial_score)/100)),
  metadata:{story_id:x.id,verified_at:x.verified_at,verified_by:x.verified_by,corroboration_count:x.corroboration_count}
 })).filter((x:any)=>x.title&&x.source_url);
}

async function run(){
 const [markets,macro,news]=await Promise.all([marketItems(),macroItems(),newsItems()]);
 const [marketResult,macroResult,newsResult]=await Promise.all([
  postBatch("market_batch",markets),
  postBatch("macro_batch",macro),
  postBatch("news_batch",news)
 ]);
 return {ok:true,asOf:new Date().toISOString(),collected:{markets:markets.length,macro:macro.length,news:news.length},stored:{marketResult,macroResult,newsResult}};
}

export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
 try{return NextResponse.json(await run())}catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"collector_failed"},{status:503})}
}
export async function POST(req:NextRequest){return GET(req)}
