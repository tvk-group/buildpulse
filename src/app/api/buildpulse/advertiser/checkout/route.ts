import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {buildPulseInvoiceIssuer} from "@/lib/buildpulse/payments";

export async function GET(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
  const {data:capabilities,error}=await supabase.functions.invoke("buildpulse-payment",{body:{action:"capabilities"}});
  const rails=!error&&Array.isArray(capabilities?.rails)?capabilities.rails:[];
  const expected=["ETH","BTC","USDC","USDT","XRP"];
  const configured=[...new Set(rails.map((r:{asset?:string})=>String(r.asset||"")).filter(Boolean))];
  const missing=expected.filter(asset=>!configured.includes(asset));
  return NextResponse.json({
    ok:true,
    methods:[
      {method:"stripe",label:"Card / Stripe"},
      ...rails.map((r:{asset:string;network:string;requiresMemo?:boolean})=>({method:r.asset,label:r.asset,network:r.network,requiresMemo:Boolean(r.requiresMemo)}))
    ],
    issuer:buildPulseInvoiceIssuer,
    settlement:"supabase-edge",
    cryptoCapabilitiesAvailable:!error,
    cryptoReady:missing.length===0,
    configuredCryptoAssets:configured,
    missingCryptoAssets:missing,
    cryptoStatus:error?"capability_check_failed":missing.length?"configuration_incomplete":"ready"
  });
}
