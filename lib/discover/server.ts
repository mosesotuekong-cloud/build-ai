import "server-only";
import { getAIProvider } from "@/lib/ai";
import { createMockProvider } from "@/lib/ai/mock";
import type { AIProvider } from "@/lib/ai/types";
import { readServerEnv } from "@/lib/config/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { toDiscovery, type Discovery } from "./model";

// Server helpers for quick discovery.

// The signed-in person's own discovery, read through row-level security, so
// nobody can open someone else's.
export async function getOwnDiscovery(id: string): Promise<{ discovery: Discovery; userId: string } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("discoveries").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  return { discovery: toDiscovery(data as unknown as Record<string, unknown>), userId: auth.user.id };
}

export async function listOwnDiscoveries(): Promise<Discovery[]> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data } = await supabase.from("discoveries").select("*").order("created_at", { ascending: false }).limit(50);
  return (data ?? []).map((row) => toDiscovery(row as unknown as Record<string, unknown>));
}

// The AI for one discovery. Each discovery spends from a small budget, and
// all discoveries share a daily total; when either runs out the AI is swapped
// for scripted replies, so the game never stops and never runs up a bill.
export async function aiForDiscovery(id: string, units: number): Promise<{ provider: AIProvider; scripted: boolean }> {
  const env = readServerEnv();
  const { data: allowed, error } = await createAdminClient().rpc("spend_discovery_ai", {
    target: id,
    units,
    per_discovery: env.DISCOVERY_AI_UNITS,
    daily_limit: env.DISCOVERY_DAILY_AI_UNITS,
  });
  if (error) console.error("Discovery AI budget check failed; using scripted replies:", error.message);
  if (allowed) {
    const provider = getAIProvider();
    return { provider, scripted: provider.name === "mock" };
  }
  return { provider: createMockProvider({ delayMs: env.AI_MOCK_DELAY_MS }), scripted: true };
}
