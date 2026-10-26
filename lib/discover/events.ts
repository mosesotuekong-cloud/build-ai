import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Phase 1 measurement: what happened in each discovery, for the pilot
// dashboard. Never copies the discovery's content; never blocks or breaks
// the game if writing fails.

export type DiscoveryEvent =
  | { kind: "started"; data: { function_slug: string; players: number; stack: string[]; region: string } }
  | { kind: "challenge_chosen"; data: { via: "own" | "ai" | "week" } }
  | { kind: "built"; data: { seconds_since_start: number; plan_source: string; export_ok: boolean; blocks: number; problems: number } }
  | { kind: "strengthened"; data: { readiness: number } }
  | { kind: "downloaded"; data: { file: string } }
  | { kind: "feedback"; data: { useful: number; has_comment: boolean } };

export async function recordEvent(discoveryId: string, event: DiscoveryEvent): Promise<void> {
  try {
    const { error } = await createAdminClient().from("discovery_events").insert({ discovery_id: discoveryId, kind: event.kind, data: event.data });
    if (error) console.error(`Recording ${event.kind} failed:`, error.message);
  } catch (error) {
    console.error(`Recording ${event.kind} failed:`, error instanceof Error ? error.message : error);
  }
}
