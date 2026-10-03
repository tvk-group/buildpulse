import {NextResponse} from "next/server";import {fredLatest} from "@/lib/buildpulse/market-providers";
const series=[["FEDFUNDS","Federal Funds Rate"],["CPIAUCSL","US CPI"],["UNRATE","US Unemployment"],["GDP","US GDP"]] as const;
export async function GET(){const data=(await Promise.all(series.map(async([id,label])=>{try{const x=await fredLatest(id);return x?{...x,label}:null}catch{return null}}))).filter(Boolean);return NextResponse.json({ok:data.length>0,asOf:new Date().toISOString(),data},{headers:{"cache-control":"public, s-maxage=900, stale-while-revalidate=3600"}})}
