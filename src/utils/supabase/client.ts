import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

export const createClient = () => {
  const { url, key } = getSupabasePublicConfig();
  return createBrowserClient(url, key);
};
