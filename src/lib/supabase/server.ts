import { cookies } from "next/headers";
import { createClientSafe } from "@/utils/supabase/server";

export async function createClient() {
  const cookieStore = await cookies();
  const client = createClientSafe(cookieStore);
  if (!client) {
    throw new Error("Supabase is not configured");
  }
  return client;
}
