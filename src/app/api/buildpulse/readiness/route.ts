import {NextResponse} from "next/server";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";
import {getServerEnv} from "@/config/env";
import {createAdminClient} from "@/lib/supabase/admin";
import {configuredCryptoRails} from "@/lib/buildpulse/payments";
import {getSupabasePublicConfig} from "@/lib/supabase/env";

export async function GET(){
 const e=getServerEnv(),admin=createAdminClient();
 let database=false,verifiedStories=0,activeSubscribers=0,enabledSources=0,healthySources=0,stripePaymentLinks=0;
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
  const publicConfig=getSupabasePublicConfig();
  if(publicConfig.configured){
    const publicDb=createSupabaseClient(publicConfig.url,publicConfig.key,{auth:{persistSession:false,autoRefreshToken:false}});
    const {count}=await publicDb.from("buildpulse_ad_products").select("id",{head:true,count:"exact"}).eq("active",true).not("stripe_payment_link_id","is",null).not("stripe_payment_link_url","is",null);
    stripePaymentLinks=count??0;
  }
 }catch{}
 const cryptoRails=configuredCryptoRails().map(r=>r.asset);
 const cryptoRailsReady=["ETH","BTC","USDC","USDT","XRP"].every(asset=>cryptoRails.includes(asset as any));
 const stripePaymentLinksReady=stripePaymentLinks>=7;
 const checks={
  database,
  browserSupabase:true,
  brevoApi:Boolean(e.BREVO_API_KEY?.trim()),
  brevoSender:Boolean(e.BREVO_FROM_EMAIL?.trim()),
  marketingList:Boolean(e.BREVO_MARKETING_LIST_ID?.trim()),
  founderTestList:Boolean(e.BUILDPULSE_FOUNDER_TEST_LIST_ID?.trim()),
  deliveryWebhook:Boolean(e.BREVO_WEBHOOK_SECRET?.trim()),
  founderReview:Boolean(e.BUILDPULSE_REVIEW_SECRET?.trim()),
  preferences:Boolean(e.BUILDPULSE_PREFERENCES_SECRET?.trim()),
  legacyCryptoObserver:Boolean(e.BUILDPULSE_AD_PAYMENT_WEBHOOK_SECRET?.trim()),
  legacyStripeApi:Boolean(e.STRIPE_SECRET_KEY?.trim()),
  legacyStripeWebhook:Boolean(e.STRIPE_WEBHOOK_SECRET?.trim()),
  stripePaymentLinks:stripePaymentLinksReady,
  cryptoRails:cryptoRailsReady,
  eth:cryptoRails.includes("ETH"),btc:cryptoRails.includes("BTC"),usdc:cryptoRails.includes("USDC"),usdt:cryptoRails.includes("USDT"),xrp:cryptoRails.includes("XRP"),
  cron:Boolean(e.CRON_SECRET?.trim()),
  sourceHealth:enabledSources>0&&healthySources===enabledSources,
  editorialInventory:verifiedStories>0,
  subscriberInventory:activeSubscribers>0
 };
 const stripeReady=stripePaymentLinksReady;
 const cryptoReady=cryptoRailsReady;
 const paymentsReady=stripeReady&&cryptoReady;
 const coreReady=checks.database&&checks.founderReview&&checks.preferences&&checks.cron&&checks.sourceHealth;
 const deliveryConfigured=checks.brevoApi&&checks.brevoSender&&checks.marketingList&&checks.deliveryWebhook;
 const publicationReady=coreReady&&deliveryConfigured&&checks.editorialInventory;
 const liveAudienceReady=publicationReady&&checks.subscriberInventory;
 return NextResponse.json({
  ok:true,ready:publicationReady,coreReady,deliveryReady:deliveryConfigured,publicationReady,liveAudienceReady,
  advertisingReady:paymentsReady,paymentsReady,stripeReady,cryptoReady,cryptoRails,
  paymentArchitecture:{checkout:"supabase-edge-and-stripe-payment-links",stripeSettlement:"supabase-edge",cryptoVerification:"supabase-edge",legacyVercelSecretsRequired:false},
  checks,
  counts:{enabledSources,healthySources,verifiedStories,activeSubscribers,stripePaymentLinks}
 },{headers:{"cache-control":"no-store"}});
}
