import {NextRequest,NextResponse} from "next/server";
import {createHash} from "crypto";
import {createAdminClient} from "@/lib/supabase/admin";
import {marketQuote,fredLatest} from "@/lib/buildpulse/market-providers";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;

const endpoint=()=>process.env.SOVRA_MARKET_INGEST_ENDPOINT?.trim();
const marketToken=()=>process.env.SOVRA_MARKET_CRON_TOKEN?.trim();
const sha=(v:string)=>createHash("sha256").update(v).digest("hex");

function authorized(req:NextRequest){
  const cron=process.env.CRON_SECRET?.trim();
  return Boolean(cron&&req.headers.get("authorization")===`Bearer ${cron}`);
}
function sourceId(provider:string){return provider==="Twelve Data"?"twelve-data":provider==="Finnhub"?"finnhub":"buildpulse-news"}
function instrumentId(symbol:string){
  const s=symbol.toUpperCase();
  if(["AAPL","MSFT","NVDA"].includes(s))return "equity:"+s.toLowerCase();
  if(["SPY","QQQ"].includes(s))return "etf:"+s.toLowerCase();
  return "";
}

async function marketItems(){
  const rows:any[]=[];
  for(const symbol of ["AAPL","MSFT","NVDA","SPY","QQQ"]){
    try{
      const q=await marketQuote(symbol),id=instrumentId(symbol);
      if(q&&id)rows.push({
        instrument_id:id,source_id:sourceId(q.provider),observed_at:q.timestamp,price:q.price,
        raw:{currency:q.currency||"USD",realtime:q.realtime,provider:q.provider}
      });
    }catch{}
  }
  return rows;
}
async function macroItems(){
  const rows:any[]=[];
  const defs=[["FEDFUNDS","percent","monthly","US"],["CPIAUCSL","index","monthly","US"],["UNRATE","percent","monthly","US"],["GDP","billions-usd","quarterly","US"],["DGS10","percent","daily","US"],["DEXUSEU","usd-per-eur","daily","US"]] as const;
  for(const [seriesId,unit,frequency,region] of defs){
    try{
      const x=await fredLatest(seriesId);
      if(x)rows.push({
        series_id:seriesId,observed_at:x.date+"T00:00:00Z",source_id:"fred",value:x.value,
        unit,frequency,region,release_at:x.retrievedAt,revision:0,raw:{provider:x.provider}
      });
    }catch{}
  }
  return rows;
}
async function newsItems(){
  const db=createAdminClient();if(!db)return [];
  const since=new Date(Date.now()-36*3600_000).toISOString();
  const {data}=await db.from("buildpulse_stories")
    .select("id,title,summary,category,canonical_url,canonical_source_url,published_at,verification_state,editorial_score,corroboration_count")
    .eq("verification_state","verified")
    .gte("published_at",since)
    .order("published_at",{ascending:false})
    .limit(150);
  return (data??[]).map((x:any)=>({
    canonical_url:String(x.canonical_url||x.canonical_source_url||""),
    published_at:x.published_at,
    title:String(x.title||"").slice(0,500),
    summary:String(x.summary||"").slice(0,2000),
    language:"en",region:"GLOBAL",topics:[String(x.category||"world")],entities:[],
    content_hash:sha([x.id,x.title,x.canonical_url,x.published_at].join("|")),
    verification_status:"verified",
    editorial_score:x.editorial_score,
    corroboration_count:x.corroboration_count
  })).filter((x:any)=>x.title&&x.canonical_url);
}
async function run(){
  const url=endpoint(),token=marketToken();
  if(!url||!token)throw new Error("sovra_market_not_configured");
  const [market,macro,news]=await Promise.all([marketItems(),macroItems(),newsItems()]);
  const response=await fetch(url,{
    method:"POST",
    headers:{"content-type":"application/json","x-sovra-market-token":token},
    body:JSON.stringify({mode:"buildpulse",market,macro,news}),
    cache:"no-store",
    signal:AbortSignal.timeout(30_000)
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(String(data?.error||"sovra_market_ingest_failed"));
  return {ok:true,asOf:new Date().toISOString(),submitted:{market:market.length,macro:macro.length,news:news.length},sovra:data};
}
export async function GET(req:NextRequest){
  if(!authorized(req))return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
  try{return NextResponse.json(await run())}catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"collector_failed"},{status:503})}
}
export async function POST(req:NextRequest){return GET(req)}
