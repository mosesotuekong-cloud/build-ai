import "server-only";
import { readServerEnv } from "@/lib/config/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAIProvider } from "./index";
import { createMockProvider } from "./mock";
import type { AIProvider } from "./types";

type Admin = ReturnType<typeof createAdminClient>;

// Picks the AI provider for work done for an organisation. Real
// organisations get the normal provider. Demo sandboxes spend from a small
// budget (their own, and a daily total across all sandboxes); once that runs
// out they get scripted replies, so the demo never breaks and never runs up
// a bill. `units` is roughly the number of AI calls the work will make.
export async function aiForOrg(orgId: string, units: number, admin: Admin = createAdminClient()): Promise<AIProvider> {
  const { data: org } = await admin.from("organizations").select("is_demo").eq("id", orgId).maybeSingle();
  if (!org?.is_demo) return getAIProvider();
  const env = readServerEnv();
  const { data: allowed, error } = await admin.rpc("spend_demo_ai", { target_org: orgId, amount: units, daily_limit: env.DEMO_DAILY_AI_UNITS });
  if (error) console.error("Demo AI budget check failed; using scripted replies:", error.message);
  return allowed ? getAIProvider() : createMockProvider({ delayMs: env.AI_MOCK_DELAY_MS });
}

// The same, for work that belongs to a session.
export async function aiForSession(sessionId: string, units: number, admin: Admin = createAdminClient()): Promise<AIProvider> {
  const { data: session } = await admin.from("sessions").select("org_id").eq("id", sessionId).maybeSingle();
  return session ? aiForOrg(session.org_id, units, admin) : getAIProvider();
}
