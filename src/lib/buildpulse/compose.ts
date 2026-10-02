import { createAdminClient } from "@/lib/supabase/admin";
import { sendFounderBuildPulseReview } from "@/lib/buildpulse/founder-review-email";

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
function httpsUrl(value:string|null|undefined){try{const url=new URL(value??"");return url.protocol==="https:"?url.toString():null}catch{return null}}

export async function composeBuildPulseEdition(editionId:string){
 const admin=createAdminClient(); if(!admin) throw new Error("Supabase admin unavailable");
 const {data:edition,error}=await admin.from("buildpulse_editions").select("*").eq("id",editionId).single();
 if(error||!edition) throw new Error("Edition not found");
 if(!["draft","review","failed"].includes(edition.status)) throw new Error("Edition is immutable after approval or delivery scheduling");
 const {data:links}=await admin.from("buildpulse_edition_stories").select("section,position,buildpulse_stories(id,title,summary,canonical_url,canonical_source_url,verification_state,verified_at,verified_by)").eq("edition_id",editionId).order("position");
 const rows=(links??[]).filter((x:any)=>x.buildpulse_stories?.verification_state==="verified"&&x.buildpulse_stories?.verified_at&&x.buildpulse_stories?.verified_by&&x.buildpulse_stories?.canonical_source_url);
 if(!rows.length) throw new Error("Edition has no verified stories");
 const blocks=rows.map((x:any)=>{const source=httpsUrl(x.buildpulse_stories.canonical_source_url);return `<section><p style="font:700 12px Arial;letter-spacing:.12em;text-transform:uppercase;color:#64748b">${esc(x.section)}</p><h2 style="font:700 24px Arial;color:#0f172a">${esc(x.buildpulse_stories.title)}</h2><p style="font:16px/1.65 Arial;color:#334155">${esc(x.buildpulse_stories.summary??"")}</p>${source?`<p><a href="${esc(source)}">Read source</a></p>`:""}</section>`}).join("");

 const now=new Date().toISOString();
 const {data:newsletterProducts}=await admin.from("buildpulse_ad_products").select("id").eq("placement","newsletter").eq("active",true);
 const productIds=(newsletterProducts??[]).map(item=>item.id);
 const {data:sponsor}=productIds.length?await admin.from("buildpulse_ad_orders").select("id,headline,copy_text,destination_url").eq("status","active").in("product_id",productIds).lte("starts_at",now).gte("ends_at",now).order("created_at",{ascending:true}).limit(1).maybeSingle():{data:null};
 const sponsorUrl=httpsUrl(sponsor?.destination_url);
 const sponsorBlock=sponsor&&sponsorUrl?`<aside style="margin:32px 0;padding:20px;border:1px solid #cbd5e1;border-radius:14px"><p style="font:700 10px Arial;letter-spacing:.16em;color:#64748b">ADVERTISEMENT</p>${sponsor.headline?`<h3 style="font:700 19px Arial;color:#0f172a">${esc(sponsor.headline)}</h3>`:""}${sponsor.copy_text?`<p style="font:14px/1.6 Arial;color:#475569">${esc(sponsor.copy_text)}</p>`:""}<p><a rel="sponsored" href="${esc(sponsorUrl)}">Visit sponsor</a></p></aside>`:"";

 const {data:affiliateRows}=await admin.from("buildpulse_affiliate_links").select("label,destination_url,disclosure").eq("active",true).limit(5);
 const affiliates=(affiliateRows??[]).map(item=>({label:item.label,url:httpsUrl(item.destination_url),disclosure:item.disclosure})).filter(item=>item.url);
 const affiliateBlock=affiliates.length?`<aside style="margin:32px 0;padding:20px;background:#f8fafc;border-radius:14px"><p style="font:700 10px Arial;letter-spacing:.16em;color:#64748b">AFFILIATE DISCLOSURE</p><p style="font:12px/1.6 Arial;color:#64748b">BuildPulse may receive compensation when a reader uses a disclosed affiliate link. This does not alter editorial verification.</p><ul>${affiliates.map(item=>`<li><a rel="sponsored" href="${esc(item.url!)}">${esc(item.label)}</a> - ${esc(item.disclosure)}</li>`).join("")}</ul></aside>`:"";

 const html=`<!doctype html><html><body style="margin:0;background:#f8fafc"><main style="max-width:720px;margin:auto;padding:40px 24px;background:white"><p style="font:700 12px Arial;letter-spacing:.18em">TVK BUILDPULSE</p><h1 style="font:800 38px Arial;color:#0f172a">${esc(edition.subject)}</h1><p style="font:16px Arial;color:#64748b">${esc(edition.preheader??"Global Technology & Digital Intelligence")}</p>${blocks}${sponsorBlock}${affiliateBlock}<hr/><p style="font:12px/1.5 Arial;color:#64748b">BuildPulse separates sourced reporting from TVK/EnteleKRON ecosystem updates. Commercial placements are labeled and do not determine editorial verification. Manage your email preferences or <a href="{{ unsubscribe }}">unsubscribe</a> at any time. Brevo processes the recipient-specific unsubscribe destination when the campaign is sent.</p></main></body></html>`;
 const revision=(edition.revision_number??1)+(edition.body_html?1:0);
 const {error:updateError}=await admin.from("buildpulse_editions").update({body_html:html,status:"review",revision_number:revision,founder_review_status:"pending",founder_review_notes:null,founder_approved_revision:null,approved_at:null,approved_by:null,updated_at:new Date().toISOString()}).eq("id",editionId).in("status",["draft","review","failed"]); if(updateError) throw new Error("Edition composition could not be persisted");
 const review=await sendFounderBuildPulseReview({id:editionId,subject:edition.subject,preheader:edition.preheader,body_html:html,edition_type:edition.edition_type,slug:edition.slug,revision_number:revision});
 if(!review.sent) throw new Error(`Founder review email failed: ${review.reason}`);
 await admin.from("buildpulse_editions").update({founder_review_status:"sent",founder_review_sent_at:new Date().toISOString()}).eq("id",editionId).eq("revision_number",revision);
 return {html,storyCount:rows.length,revision,founderReview:"sent" as const};
}
