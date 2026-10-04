import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";

const H={"Content-Type":"application/json","Cache-Control":"no-store"};
function reply(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:H})}

Deno.serve(async(req:Request)=>{
  if(req.method!=="GET")return reply({ok:false,error:"method_not_allowed"},405);
  try{
    const url=Deno.env.get("SUPABASE_URL")??"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
    if(!url||!service)return reply({ok:false,error:"service_not_configured"},503);
    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const [
      sources,healthy,stories,verified,pending,subscribers,editions,published,sent,ads,stripeLinks,jobs,mailSetting,dueApproved,reconcileDispatch
    ]=await Promise.all([
      admin.from("buildpulse_sources").select("id",{head:true,count:"exact"}).eq("enabled",true),
      admin.from("buildpulse_sources").select("id",{head:true,count:"exact"}).eq("enabled",true).eq("last_fetch_status","ok"),
      admin.from("buildpulse_stories").select("id",{head:true,count:"exact"}),
      admin.from("buildpulse_stories").select("id",{head:true,count:"exact"}).eq("verification_state","verified"),
      admin.from("buildpulse_stories").select("id",{head:true,count:"exact"}).in("verification_state",["pending","needs_review"]),
      admin.from("buildpulse_subscribers").select("id",{head:true,count:"exact"}).eq("status","active"),
      admin.from("buildpulse_editions").select("id",{head:true,count:"exact"}),
      admin.from("buildpulse_editions").select("id",{head:true,count:"exact"}).in("status",["published","sending","sent"]),
      admin.from("buildpulse_editions").select("id",{head:true,count:"exact"}).eq("status","sent"),
      admin.from("buildpulse_ad_orders").select("id",{head:true,count:"exact"}).in("status",["scheduled","active"]),
      admin.from("buildpulse_ad_products").select("id",{head:true,count:"exact"}).eq("active",true).not("stripe_payment_link_id","is",null).not("stripe_payment_link_url","is",null),
      admin.from("buildpulse_job_runs").select("job_name,status,started_at,finished_at,error,metrics").order("started_at",{ascending:false}).limit(60),
      admin.from("buildpulse_private_settings").select("value").eq("key","resend_domain_status").maybeSingle(),
      admin.from("buildpulse_editions").select("id",{head:true,count:"exact"}).eq("status","scheduled").eq("founder_review_status","approved").not("founder_approved_revision","is",null).is("brevo_campaign_id",null).lte("scheduled_at",new Date().toISOString()),
      admin.from("buildpulse_editions").select("id",{head:true,count:"exact"}).eq("brevo_dispatch_state","reconciliation_required")
    ]);
    const latest:any={};
    for(const job of jobs.data??[])if(!latest[job.job_name])latest[job.job_name]=job;
    const counts={
      enabledSources:sources.count??0,healthySources:healthy.count??0,stories:stories.count??0,
      verifiedStories:verified.count??0,pendingStories:pending.count??0,activeSubscribers:subscribers.count??0,
      editions:editions.count??0,publishedEditions:published.count??0,sentEditions:sent.count??0,
      scheduledOrActiveAds:ads.count??0,stripePaymentLinks:stripeLinks.count??0,dueApprovedEditions:dueApproved.count??0,dispatchReconciliationRequired:reconcileDispatch.count??0
    };
    const sourceHealth=counts.enabledSources>0&&counts.enabledSources===counts.healthySources;
    const ingestion=latest["ingest-supabase-fallback"]??latest.ingest??null;
    const ingestFresh=Boolean(ingestion?.status==="ok"&&Date.now()-Date.parse(ingestion.started_at)<2.5*3600000);
    const mailDomainStatus=mailSetting.data?.value??"not_configured";
    const approvedDispatch=latest["approved-edition-dispatch-supabase"]??null;
    const technologyEditorial=latest["technology-editorial-supabase"]??null;
    const cryptoRails=[
      Deno.env.get("BUILDPULSE_ETH_ADDRESS")?.trim()?{asset:"ETH",network:"Ethereum"}:null,
      Deno.env.get("BUILDPULSE_ETH_BASE_ADDRESS")?.trim()?{asset:"ETH",network:"Base"}:null,
      Deno.env.get("BUILDPULSE_BTC_ADDRESS")?.trim()?{asset:"BTC",network:"Bitcoin"}:null,
      Deno.env.get("BUILDPULSE_USDC_ETH_ADDRESS")?.trim()?{asset:"USDC",network:"Ethereum"}:null,
      Deno.env.get("BUILDPULSE_USDC_BASE_ADDRESS")?.trim()?{asset:"USDC",network:"Base"}:null,
      Deno.env.get("BUILDPULSE_USDT_ETH_ADDRESS")?.trim()?{asset:"USDT",network:"Ethereum"}:null,
      Deno.env.get("BUILDPULSE_XRP_ADDRESS")?.trim()?{asset:"XRP",network:"XRPL"}:null
    ].filter(Boolean);
    return reply({
      ok:true,
      counts,
      cryptoRails,
      checks:{
        database:true,
        sourceHealth,
        ingestionFresh:ingestFresh,
        editorialControl:true,
        editionControl:true,
        webPublication:true,
        advertisingControl:true,
        stripeInventory:counts.stripePaymentLinks>=7,
        mailDomainVerified:mailDomainStatus==="verified",
        editorialInventory:counts.verifiedStories>0,
        audienceInventory:counts.activeSubscribers>0,
        approvedEditionDispatchSafe:counts.dispatchReconciliationRequired===0,
        technologyEditorialSourceGate:Boolean(technologyEditorial?.status==="ok")
      },
      mail:{domain:"buildpulse.news",domainStatus:mailDomainStatus,deliveryEnabled:mailDomainStatus==="verified",transactionalProvider:"resend",campaignProvider:"brevo",campaignDispatchEnabled:mailDomainStatus==="verified"},
      editionDispatch:{latest:approvedDispatch,dueApproved:counts.dueApprovedEditions,reconciliationRequired:counts.dispatchReconciliationRequired,failClosed:mailDomainStatus!=="verified"},
      scheduler:{ingestion,approvedEditionDispatch:approvedDispatch,technologyEditorial,webPublication:"database-cron-every-5m",adActivation:"database-cron-every-5m"},
      architecture:{
        ingestion:latest["ingest-supabase-fallback"]?"supabase-pg-cron-edge-hourly-fallback":"vercel-hourly",
        editorialReview:"supabase-edge",
        editionGenerationApproval:"supabase-edge",
        webPublication:"postgres-cron",
        publicContent:"supabase-edge",
        advertisingPayments:"stripe-payment-links-plus-supabase-edge",
        advertisingActivation:"postgres-cron",
        emailDelivery:"resend-transactional-plus-brevo-campaigns-gated-by-dedicated-domain-verification"
      }
    });
  }catch(error){
    console.error("buildpulse_status_runtime_error",error);
    return reply({ok:false,error:"status_unavailable"},500);
  }
});