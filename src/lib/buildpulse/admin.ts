import { createAdminClient } from "@/lib/supabase/admin";
export async function getBuildPulseReviewQueue(){
 const admin=createAdminClient(); if(!admin)return {stories:[],editions:[]};
 const [{data:stories},{data:editions}]=await Promise.all([
  admin.from("buildpulse_stories").select("id,title,summary,category,canonical_url,published_at,verification_state,editorial_score,corroboration_count").in("verification_state",["pending","needs_review"]).order("published_at",{ascending:false}).limit(100),
  admin.from("buildpulse_editions").select("id,edition_type,locale,subject,preheader,slug,status,scheduled_at,updated_at").in("status",["draft","review","approved","scheduled"]).order("updated_at",{ascending:false}).limit(50)
 ]);
 return {stories:stories??[],editions:editions??[]};
}
