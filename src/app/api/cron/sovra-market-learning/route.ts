import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=30;

function authorized(req:NextRequest){
  const cron=process.env.CRON_SECRET?.trim();
  if(!cron)return false;
  return req.headers.get("authorization")===`Bearer ${cron}`;
}

export async function GET(req:NextRequest){
  if(!authorized(req))return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
  const endpoint=process.env.SOVRA_MARKET_INGEST_ENDPOINT?.trim();
  const token=process.env.SOVRA_MARKET_CRON_TOKEN?.trim();
  if(!endpoint||!token)return NextResponse.json({ok:false,error:"sovra_market_collector_not_configured"},{status:503});
  try{
    const response=await fetch(endpoint,{
      method:"POST",
      headers:{"content-type":"application/json","x-sovra-market-token":token},
      body:JSON.stringify({mode:"all"}),
      cache:"no-store",
      signal:AbortSignal.timeout(20_000)
    });
    const data=await response.json().catch(()=>({}));
    return NextResponse.json({ok:response.ok,delegated:true,collector:"SOVRA AI",data},{status:response.ok?200:503});
  }catch{
    return NextResponse.json({ok:false,error:"sovra_market_collector_unavailable"},{status:503});
  }
}
export async function POST(req:NextRequest){return GET(req)}
