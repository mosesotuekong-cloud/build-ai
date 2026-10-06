import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { readServerEnv } from "@/lib/config/env";

// Service-role client. Bypasses RLS, so use it only for trusted server work
// (token enforcement, phase transitions, admin sync) and never in the browser.
export function createAdminClient() {
  const env = readServerEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Run `npm run env:local`.");
  }
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
