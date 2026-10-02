import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {buildPulseInvoiceIssuer,configuredCryptoRails} from "@/lib/buildpulse/payments";

export async function GET(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
  return NextResponse.json({
    ok:true,
    methods:[
      {method:"stripe",label:"Card / Stripe"},
      ...configuredCryptoRails().map(r=>({method:r.asset,label:r.asset,network:r.network,requiresMemo:Boolean(r.memo)}))
    ],
    issuer:buildPulseInvoiceIssuer,
    settlement:"supabase-edge"
  });
}
