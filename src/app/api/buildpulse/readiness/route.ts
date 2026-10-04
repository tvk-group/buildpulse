import {NextResponse} from "next/server";
import {getSupabasePublicConfig} from "@/lib/supabase/env";

export async function GET(){
  const config=getSupabasePublicConfig();
  let status:any=null;
  if(config.configured){
    try{
      const endpoint=new URL("/functions/v1/buildpulse-status-runtime",config.url);
      const response=await fetch(endpoint,{cache:"no-store",headers:{apikey:config.key}});
      status=response.ok?await response.json().catch(()=>null):null;
    }catch{
      status=null;
    }
  }
  const cryptoRailDetails=Array.isArray(status?.cryptoRails)?status.cryptoRails:[];
  const cryptoRails=[...new Set(cryptoRailDetails.map((r:{asset?:string})=>String(r?.asset||"")).filter(Boolean))];
  const requiredCryptoAssets=["ETH","BTC","USDC","USDT","XRP"] as const;
  const missingCryptoAssets=requiredCryptoAssets.filter(asset=>!cryptoRails.includes(asset));
  const cryptoReady=missingCryptoAssets.length===0;
  const stripeReady=Boolean(status?.checks?.stripeInventory);
  const paymentsReady=stripeReady&&cryptoReady;
  const webPipelineReady=Boolean(status?.checks?.database&&status?.checks?.sourceHealth&&status?.checks?.ingestionFresh&&status?.checks?.editorialControl&&status?.checks?.editionControl&&status?.checks?.webPublication);
  const firstEditionReady=webPipelineReady&&Boolean(status?.checks?.editorialInventory);
  const emailDeliveryReady=Boolean(status?.checks?.mailDomainVerified)&&Boolean(status?.checks?.audienceInventory);
  const serverAdminConfigured=Boolean((process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim());
  const cronConfigured=Boolean(process.env.CRON_SECRET?.trim());
  const nvidiaConfigured=Boolean((process.env.NVIDIA_NIM_API_KEY||process.env.NVIDIA_API_KEY)?.trim());
  const privilegedAutomationReady=serverAdminConfigured&&cronConfigured;
  return NextResponse.json({
    ok:Boolean(status?.ok),
    ready:webPipelineReady,
    webPipelineReady,
    firstEditionReady,
    emailDeliveryReady,
    advertisingReady:paymentsReady,
    paymentsReady,
    stripeReady,
    cryptoReady,
    requiredCryptoAssets,
    missingCryptoAssets,
    cryptoRails,
    cryptoRailDetails,
    supabaseConfigured:config.configured,
    serverAdminConfigured,
    cronConfigured,
    nvidiaConfigured,
    privilegedAutomationReady,
    mail:status?.mail??{provider:"resend",domain:"buildpulse.news",domainStatus:"unknown",deliveryEnabled:false},
    checks:status?.checks??{},
    counts:status?.counts??{},
    scheduler:status?.scheduler??{},
    architecture:{...(status?.architecture??{}),payments:{checkout:"stripe-payment-links-plus-supabase-edge",cryptoVerification:"supabase-edge",legacyVercelSecretsRequired:false}}
  },{headers:{"cache-control":"no-store"}});
}
