import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/types";
import { supabasePublicEnv } from "./public-env";

// A Supabase client for client components. RLS applies.
export function createClient() {
  const { url, anonKey } = supabasePublicEnv();
  return createBrowserClient<Database>(url, anonKey);
}
