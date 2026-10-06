"use server";

import { requireFacilitator } from "@/lib/auth/facilitator";
import { getN8nClient } from "@/lib/n8n";
import type { GeneratedCase } from "@/lib/ai/schemas/cases";

export type SystemCheckResult =
  | { ok: true; mode: "local" | "remote"; ms: number; cases: GeneratedCase[] }
  | { ok: false; message: string };

// Runs one case generation end to end (n8n client → AI provider → zod) so a
// facilitator can see the plumbing works. Uses fixtures when keys are missing.
export async function runSystemCheck(): Promise<SystemCheckResult> {
  await requireFacilitator();
  const client = getN8nClient();
  const started = Date.now();
  try {
    const deck = await client.run("generate-cases", {
      function_slug: "finance",
      function_name: "Finance",
      industry: "Fast-moving consumer goods distribution",
      company_size: "120 staff",
      tools: ["Excel", "WhatsApp", "Sage", "Gmail"],
    });
    return { ok: true, mode: client.mode, ms: Date.now() - started, cases: deck.cases };
  } catch (error) {
    console.error("System check failed", error instanceof Error ? error.message : error);
    return { ok: false, message: "Case generation didn't work this time. Check the server logs for details." };
  }
}
