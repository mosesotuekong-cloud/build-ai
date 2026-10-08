"use server";

import { z } from "zod";
import { getAIProvider } from "@/lib/ai";
import { runDesignCheck } from "@/lib/ai/tasks/check-and-twist";
import { loadPlayerTeam } from "@/lib/play/load";
import { createAdminClient } from "@/lib/supabase/admin";

const idSchema = z.uuid();
const CHECK_COST = 1;

export type CheckMessage = { id: string; slot: string | null; content: string; type: string | null; trigger: string | null };
export type DesignCheckResult =
  | { ok: true; tokens: number; messages: CheckMessage[]; clean: boolean }
  | { ok: false; message: string; tokens?: number };

// "Check our design": costs one coin, flags hard errors only, each as a
// question beside the slot it's about. Flags are stored for the report.
// If the AI fails, the coin is refunded and nothing is stored.
export async function checkDesign(teamId: string): Promise<DesignCheckResult> {
  const data = await loadPlayerTeam(idSchema.parse(teamId));
  if (!data || !data.case) return { ok: false, message: "You're not on this team." };
  if (data.session.phase !== "solving" && data.session.phase !== "solving_after_twist") {
    return { ok: false, message: "You can check your design while you're designing." };
  }

  const admin = createAdminClient();
  const { data: left } = await admin.rpc("spend_hint_tokens", { target_team: data.team.id, amount: CHECK_COST });
  if (left === null || left < 0) return { ok: false, message: "You're out of coins. Plain coach questions are still free." };

  let result: Awaited<ReturnType<typeof runDesignCheck>>;
  try {
    result = await runDesignCheck(getAIProvider(), {
      case: data.case,
      design: data.design,
      phase: data.session.phase,
      twist: data.twist?.content ?? null,
      platforms: data.session.target_platforms,
    });
  } catch (error) {
    console.error("Design check failed; refunding.", error instanceof Error ? error.message : error);
    const { data: refunded } = await admin.rpc("add_hint_tokens", { target_team: data.team.id, amount: CHECK_COST });
    return { ok: false, message: "The check didn't work this time, so your coin is back. Try again in a moment.", tokens: refunded ?? undefined };
  }

  const version = data.session.phase === "solving_after_twist" ? "after_twist" : "before_twist";
  await admin.from("design_checks").insert({ team_id: data.team.id, design_version: version, flags: result.flags, source: result.reworded ? "fallback" : "ai" });
  await admin.from("coach_messages").insert({ team_id: data.team.id, role: "team", content: "We asked for a design check.", trigger: "asked", tokens_spent: CHECK_COST, player_id: data.playerId });

  type FlagRow = { team_id: string; role: "coach"; type: "flag"; slot: string; content: string; trigger: "inline_flag" | "asked" };
  const rows: FlagRow[] = result.flags.length
    ? result.flags.map((f) => ({ team_id: data.team.id, role: "coach", type: "flag", slot: f.slot, content: f.question, trigger: "inline_flag" }))
    : [
        {
          team_id: data.team.id,
          role: "coach",
          type: "flag",
          slot: "general",
          content: "No hard errors found. That doesn't make it perfect: ask the coach what could go wrong on a bad day.",
          trigger: "asked",
        },
      ];
  const { data: saved } = await admin.from("coach_messages").insert(rows).select("id, slot, content, type, trigger");
  return { ok: true, tokens: left, messages: saved ?? [], clean: result.flags.length === 0 };
}
