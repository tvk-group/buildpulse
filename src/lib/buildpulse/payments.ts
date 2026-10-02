import { getServerEnv } from "@/config/env";

export type BuildPulseCryptoAsset = "ETH"|"BTC"|"USDC"|"USDT"|"XRP";

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
  const rails:Rail[]=[
    {asset:"ETH",network:"Ethereum",destination:env.BUILDPULSE_ETH_ADDRESS??"0x1A5a410a35d8685A0C5F58E61B3083Ea20820e0f",decimals:8,requiredConfirmations:12},
    {asset:"BTC",network:"Bitcoin",destination:env.BUILDPULSE_BTC_ADDRESS??"bc1q6gyckg3ya4zwhslnr3regspj8pk5anyaz50ynl",decimals:8,requiredConfirmations:3},
    {asset:"USDC",network:env.BUILDPULSE_USDC_NETWORK??"Base",destination:env.BUILDPULSE_USDC_ADDRESS??"0x1A5a410a35d8685A0C5F58E61B3083Ea20820e0f",decimals:6,requiredConfirmations:20},
    {asset:"USDT",network:env.BUILDPULSE_USDT_NETWORK??"Ethereum",destination:env.BUILDPULSE_USDT_ADDRESS??"0x1A5a410a35d8685A0C5F58E61B3083Ea20820e0f",decimals:6,requiredConfirmations:12},
    {asset:"XRP",network:"XRPL",destination:env.BUILDPULSE_XRP_ADDRESS??"rPoLiQPahRkwi9dkhiCgw98x84fQCviT7Z",memo:env.BUILDPULSE_XRP_DESTINATION_TAG??"1234",decimals:6,requiredConfirmations:1},
  ];
  return rails.filter(r=>Boolean(r.destination));
}

export function getCryptoRail(asset:string){
  return configuredCryptoRails().find(r=>r.asset===asset.toUpperCase());
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
  const factor=10**decimals;
  return Math.ceil((usd/rate)*factor)/factor;
}
