import { getServerEnv } from "@/config/env";

export type BuildPulseCryptoAsset = "ETH"|"BTC"|"USDC"|"USDT"|"XRP"|"SOL"|"BNB"|"POL"|"TRX"|"ADA"|"SUI"|"AVAX";

export const buildPulseInvoiceIssuer = {
  name: "TVK LABS & TECHNOLOGIES LTD",
  companyNumber: "16481808",
  registeredOffice: "Office 23, Unit 5, 399-405 Oxford Street, London, United Kingdom, W1C 2BU",
} as const;

export function invoiceNumberForOrder(orderId:string, createdAt?:string){
  const year = new Date(createdAt ?? Date.now()).getUTCFullYear();
  return `BP-${year}-${orderId.replaceAll("-","").slice(0,12).toUpperCase()}`;
}

type Rail={asset:BuildPulseCryptoAsset;network:string;destination:string;memo?:string;decimals:number;requiredConfirmations:number};

export function configuredCryptoRails():Rail[]{
  const env=getServerEnv();
  const candidates:Array<Rail|null>=[
    env.BUILDPULSE_ETH_ADDRESS?{asset:"ETH",network:"Ethereum",destination:env.BUILDPULSE_ETH_ADDRESS,decimals:18,requiredConfirmations:12}:null,
    env.BUILDPULSE_ETH_BASE_ADDRESS?{asset:"ETH",network:"Base",destination:env.BUILDPULSE_ETH_BASE_ADDRESS,decimals:18,requiredConfirmations:20}:null,
    env.BUILDPULSE_BTC_ADDRESS?{asset:"BTC",network:"Bitcoin",destination:env.BUILDPULSE_BTC_ADDRESS,decimals:8,requiredConfirmations:3}:null,
    env.BUILDPULSE_USDC_ETH_ADDRESS?{asset:"USDC",network:"Ethereum",destination:env.BUILDPULSE_USDC_ETH_ADDRESS,decimals:6,requiredConfirmations:12}:null,
    env.BUILDPULSE_USDC_BASE_ADDRESS?{asset:"USDC",network:"Base",destination:env.BUILDPULSE_USDC_BASE_ADDRESS,decimals:6,requiredConfirmations:20}:null,
    env.BUILDPULSE_USDT_ETH_ADDRESS?{asset:"USDT",network:"Ethereum",destination:env.BUILDPULSE_USDT_ETH_ADDRESS,decimals:6,requiredConfirmations:12}:null,
    env.BUILDPULSE_USDT_BASE_ADDRESS?{asset:"USDT",network:"Base",destination:env.BUILDPULSE_USDT_BASE_ADDRESS,decimals:6,requiredConfirmations:20}:null,
    env.BUILDPULSE_XRP_ADDRESS?{asset:"XRP",network:"XRPL",destination:env.BUILDPULSE_XRP_ADDRESS,memo:env.BUILDPULSE_XRP_DESTINATION_TAG,decimals:6,requiredConfirmations:1}:null,
    env.BUILDPULSE_SOL_ADDRESS?{asset:"SOL",network:"Solana",destination:env.BUILDPULSE_SOL_ADDRESS,decimals:9,requiredConfirmations:1}:null,
    env.BUILDPULSE_BNB_ADDRESS?{asset:"BNB",network:"BNB Chain",destination:env.BUILDPULSE_BNB_ADDRESS,decimals:18,requiredConfirmations:15}:null,
    env.BUILDPULSE_POL_ADDRESS?{asset:"POL",network:"Polygon",destination:env.BUILDPULSE_POL_ADDRESS,decimals:18,requiredConfirmations:64}:null,
    env.BUILDPULSE_TRX_ADDRESS?{asset:"TRX",network:"TRON",destination:env.BUILDPULSE_TRX_ADDRESS,decimals:6,requiredConfirmations:20}:null,
    env.BUILDPULSE_ADA_ADDRESS?{asset:"ADA",network:"Cardano",destination:env.BUILDPULSE_ADA_ADDRESS,decimals:6,requiredConfirmations:15}:null,
    env.BUILDPULSE_SUI_ADDRESS?{asset:"SUI",network:"Sui",destination:env.BUILDPULSE_SUI_ADDRESS,decimals:9,requiredConfirmations:1}:null,
    env.BUILDPULSE_AVAX_ADDRESS?{asset:"AVAX",network:"Avalanche C-Chain",destination:env.BUILDPULSE_AVAX_ADDRESS,decimals:18,requiredConfirmations:12}:null,
  ];
  return candidates.filter((rail):rail is Rail=>rail!==null);
}

export function getCryptoRail(asset:string,network?:string){
  const normalizedAsset=asset.toUpperCase();
  const normalizedNetwork=network?.trim().toLowerCase();
  const matches=configuredCryptoRails().filter(r=>r.asset===normalizedAsset);
  if(normalizedNetwork)return matches.find(r=>r.network.toLowerCase()===normalizedNetwork);
  return matches.length===1?matches[0]:undefined;
}

export async function fetchUsdSpot(asset:BuildPulseCryptoAsset){
  const base=(getServerEnv().BUILDPULSE_CRYPTO_RATE_API_BASE??"https://api.coinbase.com/v2/prices").replace(/\/$/,"");
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),6000);
  try{
    const response=await fetch(`${base}/${asset}-USD/spot`,{cache:"no-store",signal:controller.signal,headers:{"Accept":"application/json"}});
    if(!response.ok)throw new Error("rate_provider_unavailable");
    const body=await response.json() as {data?:{amount?:string}};
    const rate=Number(body.data?.amount);
    if(!Number.isFinite(rate)||rate<=0)throw new Error("invalid_market_rate");
    return rate;
  }finally{clearTimeout(timer)}
}

export function quoteAmount(usd:number, rate:number, decimals:number){
  const factor=10**Math.min(decimals,12);
  return Math.ceil((usd/rate)*factor)/factor;
}
