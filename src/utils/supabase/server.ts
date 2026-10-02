import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  const { url, key, configured } = getSupabasePublicConfig();

  if (!configured) {
    throw new Error("Supabase is not configured");
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component — middleware refreshes sessions.
        }
      },
    },
  });
};

/** Safe variant for server components — returns null instead of throwing. */
export const createClientSafe = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  const { url, key, configured } = getSupabasePublicConfig();
  if (!configured) return null;

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // ignored in Server Components
        }
      },
    },
  });
};
