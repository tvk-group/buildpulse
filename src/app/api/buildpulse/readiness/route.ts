import {NextResponse} from "next/server";
import {getServerEnv} from "@/config/env";
import {createAdminClient} from "@/lib/supabase/admin";
import {configuredCryptoRails} from "@/lib/buildpulse/payments";

export async function GET(){
 const e=getServerEnv(),admin=createAdminClient();
 let database=false,verifiedStories=0,activeSubscribers=0,enabledSources=0,healthySources=0;
 try{
  if(admin){
   const [s,v,sub,h]=await Promise.all([
    admin.from("buildpulse_sources").select("id",{head:true,count:"exact"}).eq("enabled",true),
    admin.from("buildpulse_stories").select("id",{head:true,count:"exact"}).eq("verification_state","verified"),
    admin.from("buildpulse_subscribers").select("id",{head:true,count:"exact"}).eq("status","active"),
    admin.from("buildpulse_sources").select("id",{head:true,count:"exact"}).eq("enabled",true).eq("last_fetch_status","ok")
   ]);
   database=!s.error;enabledSources=s.count??0;verifiedStories=v.count??0;activeSubscribers=sub.count??0;healthySources=h.count??0;
  }
 }catch{}
 const cryptoRails=configuredCryptoRails().map(r=>r.asset);
 const checks={
  database,
  brevoApi:Boolean(e.BREVO_API_KEY?.trim()),
  brevoSender:Boolean(e.BREVO_FROM_EMAIL?.trim()),
  marketingList:Boolean(e.BREVO_MARKETING_LIST_ID?.trim()),
  founderTestList:Boolean(e.BUILDPULSE_FOUNDER_TEST_LIST_ID?.trim()),
  deliveryWebhook:Boolean(e.BREVO_WEBHOOK_SECRET?.trim()),
  founderReview:Boolean(e.BUILDPULSE_REVIEW_SECRET?.trim()),
  preferences:Boolean(e.BUILDPULSE_PREFERENCES_SECRET?.trim()),
  adPaymentWebhook:Boolean(e.BUILDPULSE_AD_PAYMENT_WEBHOOK_SECRET?.trim()),
  stripeSecret:Boolean(e.STRIPE_SECRET_KEY?.trim()),
  stripeWebhook:Boolean(e.STRIPE_WEBHOOK_SECRET?.trim()),
  eth:cryptoRails.includes("ETH"),
  btc:cryptoRails.includes("BTC"),
  usdc:cryptoRails.includes("USDC"),
  usdt:cryptoRails.includes("USDT"),
  xrp:cryptoRails.includes("XRP"),
  cron:Boolean(e.CRON_SECRET?.trim()),
  sourceHealth:enabledSources>0&&healthySources===enabledSources,
  editorialInventory:verifiedStories>0,
  subscriberInventory:activeSubscribers>0
 };
 const stripeReady=checks.stripeSecret&&checks.stripeWebhook;
 const cryptoReady=checks.adPaymentWebhook&&checks.eth&&checks.btc&&checks.usdc&&checks.usdt&&checks.xrp;
 const paymentsReady=stripeReady&&cryptoReady;
 const coreReady=checks.database&&checks.founderReview&&checks.preferences&&checks.cron&&checks.sourceHealth;
 const deliveryConfigured=checks.brevoApi&&checks.brevoSender&&checks.marketingList&&checks.deliveryWebhook;
 const publicationReady=coreReady&&deliveryConfigured&&checks.editorialInventory;
 const liveAudienceReady=publicationReady&&checks.subscriberInventory;
 return NextResponse.json({
  ok:true,ready:publicationReady,coreReady,deliveryReady:deliveryConfigured,publicationReady,liveAudienceReady,
  advertisingReady:paymentsReady,paymentsReady,stripeReady,cryptoReady,cryptoRails,checks,
  counts:{enabledSources,healthySources,verifiedStories,activeSubscribers}
 },{headers:{"cache-control":"no-store"}});
}
