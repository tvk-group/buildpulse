export type SupabasePublicConfig={url:string;key:string;configured:boolean};

const BUILDPULSE_SUPABASE_URL="https://jdgddwutqypxxvfvkypw.supabase.co";
const BUILDPULSE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_i3J9usL83VQydL-RboidMA_xqIbvwF9";

export function getSupabasePublicConfig():SupabasePublicConfig{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()||BUILDPULSE_SUPABASE_URL;
  const key=(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim()||BUILDPULSE_SUPABASE_PUBLISHABLE_KEY;
  return {url,key,configured:Boolean(url&&key)};
}

export function requireSupabasePublicConfig():SupabasePublicConfig{
  const config=getSupabasePublicConfig();
  if(!config.configured)throw new Error("BuildPulse Supabase public configuration is unavailable.");
  return config;
}
