export type SupabasePublicConfig={url:string;key:string;configured:boolean};

export function getSupabasePublicConfig():SupabasePublicConfig{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()??"";
  const key=(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim()??"";
  return {url,key,configured:Boolean(url&&key)};
}

export function requireSupabasePublicConfig():SupabasePublicConfig{
  const config=getSupabasePublicConfig();
  if(!config.configured)throw new Error("BuildPulse Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for the dedicated BuildPulse project.");
  return config;
}
