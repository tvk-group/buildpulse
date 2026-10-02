const BUILDPULSE_SUPABASE_URL="https://etcbqqmzzcxdmzfgrxze.supabase.co";
const BUILDPULSE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_T0TvXthhSnAxxbxfwJl7Sw_vxQ5V4Ou";

export function getSupabasePublicConfig(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()||BUILDPULSE_SUPABASE_URL;
  const key=(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim()||BUILDPULSE_SUPABASE_PUBLISHABLE_KEY;
  return {url,key,configured:Boolean(url&&key)}
}