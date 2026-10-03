import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {createClientSafe} from "@/utils/supabase/server";

type QueryResult={data:any;error:any};
const failed=(name:string,r:QueryResult)=>r.error?{name,error:r.error.code||"query_failed"}:null;

export async function GET(){
 const db=createClientSafe(await cookies());
 if(!db)return NextResponse.json({ok:false},{status:503});
 const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({ok:false,error:"auth_required"},{status:401});
 const email=String(user.email??"").toLowerCase();
 const results=await Promise.all([
  db.from("buildpulse_social_profiles").select("handle,display_name,bio,discoverable,allow_messages,account_type,automation_disclosed,created_at,updated_at").eq("user_id",user.id).maybeSingle(),
  db.from("buildpulse_social_posts").select("id,kind,title,body,visibility,status,created_at,published_at").eq("author_id",user.id).order("created_at"),
  db.from("buildpulse_social_follows").select("following_id,created_at").eq("follower_id",user.id),
  db.from("buildpulse_social_follows").select("follower_id,created_at").eq("following_id",user.id),
  db.from("buildpulse_social_members").select("conversation_id,role,joined_at").eq("user_id",user.id),
  db.from("buildpulse_social_appeals").select("id,post_id,status,reason,resolution_notes,created_at,reviewed_at").eq("appellant_user_id",user.id),
  db.from("buildpulse_marketplace_listings").select("id,category,title,description,price_amount,currency,condition,status,created_at,published_at").eq("seller_id",user.id),
  db.from("buildpulse_marketplace_inquiries").select("id,listing_id,seller_id,message,status,created_at").eq("buyer_id",user.id),
  db.from("buildpulse_marketplace_orders").select("id,listing_id,buyer_id,seller_id,amount,currency,platform_fee,payment_provider,status,created_at,updated_at").or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),
  db.from("buildpulse_contributor_submissions").select("id,author_name,author_email,title,dek,body,source_urls,disclosure,rights_confirmed,accuracy_confirmed,responsibility_confirmed,status,fee_usd,payment_status,created_at,updated_at,published_at").eq("user_id",user.id),
  db.from("buildpulse_art_submissions").select("id,creator_name,creator_email,title,discipline,description,portfolio_url,media_urls,rights_confirmed,original_work_confirmed,people_release_confirmed,commercial_relationships,ai_assistance_disclosure,status,created_at,updated_at,published_at").eq("user_id",user.id),
  db.from("buildpulse_advertiser_profiles").select("company_name,billing_email,website_url,status,customer_type,billing_address_line1,billing_address_line2,billing_city,billing_region,billing_postal_code,billing_country_code,tax_id,tax_id_type,tax_id_validation_status,created_at,updated_at").eq("user_id",user.id).maybeSingle(),
  db.from("buildpulse_ad_orders").select("id,headline,copy_text,destination_url,creative_url,status,amount_usd,payment_method,payment_provider,crypto_asset,crypto_network,paid_tx_hash,paid_at,starts_at,ends_at,review_notes,created_at,updated_at").eq("user_id",user.id),
  db.from("buildpulse_intelligence_subscriptions").select("id,email,plan_code,billing_interval,status,topics,watchlist,delivery_timezone,marketing_consent,service_email_consent,current_period_end,cancelled_at,created_at,updated_at").eq("user_id",user.id),
  db.from("buildpulse_subscription_crypto_payments").select("id,email,plan_code,billing_interval,usd_amount,asset,network,expected_amount,memo,rate_usd,quoted_at,expires_at,required_confirmations,state,tx_hash,confirmed_at,entitlement_end,created_at").eq("user_id",user.id),
  db.from("buildpulse_accounting_customers").select("id,email,legal_name,business_customer,country_code,tax_id_type,tax_id_value,tax_id_status,billing_address,location_evidence,created_at,updated_at").eq("user_id",user.id).maybeSingle(),
  db.from("buildpulse_connections_profiles").select("display_name,bio,intents,adult_confirmed,country_code,region,city,visibility,created_at,updated_at").eq("user_id",user.id).maybeSingle()
 ]);
 const names=["social.profile","social.posts","social.following","social.followers","social.memberships","social.appeals","marketplace.listings","marketplace.buyerInquiries","marketplace.orders","contributor.submissions","arts.submissions","advertising.profile","advertising.orders","intelligence.subscriptions","intelligence.cryptoPayments","accounting.customer","connections.profile"];
 const failures=results.map((r,i)=>failed(names[i],r as QueryResult)).filter(Boolean);
 if(failures.length)return NextResponse.json({ok:false,error:"export_incomplete",failedQueries:failures},{status:503,headers:{"cache-control":"no-store"}});
 const [profile,posts,followsOut,followsIn,members,appeals,marketListings,marketInquiries,marketOrders,contributor,arts,advertiser,adOrders,subscriptions,cryptoPayments,customer,connections]=results.map(r=>r.data);
 const ids=(members??[]).map((x:any)=>x.conversation_id);
 const messages:QueryResult=ids.length?await db.from("buildpulse_social_messages").select("id,conversation_id,sender_id,ciphertext,nonce,key_version,client_message_id,created_at,expires_at").in("conversation_id",ids).eq("sender_id",user.id).order("created_at"):{data:[],error:null};
 if(messages.error)return NextResponse.json({ok:false,error:"export_incomplete",failedQueries:[failed("social.sentCiphertextMessages",messages)]},{status:503,headers:{"cache-control":"no-store"}});
 let documents:any[]=[];
 if(customer?.id){const docs=await db.from("buildpulse_accounting_documents").select("id,document_type,document_number,currency,net_amount,tax_amount,gross_amount,tax_jurisdiction,tax_treatment,tax_rate,reverse_charge,status,issued_at,due_at,paid_at,created_at").eq("customer_id",customer.id).order("created_at");if(docs.error)return NextResponse.json({ok:false,error:"export_incomplete",failedQueries:[failed("accounting.documents",docs)]},{status:503,headers:{"cache-control":"no-store"}});documents=docs.data??[]}
 return NextResponse.json({
  exportedAt:new Date().toISOString(),
  account:{id:user.id,email:email||null,phone:user.phone??null,createdAt:user.created_at,lastSignInAt:user.last_sign_in_at??null},
  social:{profile,posts:posts??[],following:followsOut??[],followers:followsIn??[],conversationMemberships:members??[],sentCiphertextMessages:messages.data??[],appeals:appeals??[]},
  marketplace:{listings:marketListings??[],buyerInquiries:marketInquiries??[],orders:marketOrders??[]},
  contributor:{submissions:contributor??[]},arts:{submissions:arts??[]},
  advertising:{profile:advertiser,orders:adOrders??[]},
  intelligence:{subscriptions:subscriptions??[],cryptoPayments:cryptoPayments??[]},
  accounting:{customer,documents},
  connections:{profile:connections},
  notice:"BuildPulse account export. Encrypted Social message bodies remain ciphertext. Provider-internal secrets, fraud controls, workforce-only notes and third-party data belonging to other users are excluded."
 },{headers:{"content-disposition":`attachment; filename="buildpulse-export-${new Date().toISOString().slice(0,10)}.json"`,"cache-control":"no-store","x-content-type-options":"nosniff"}});
}
