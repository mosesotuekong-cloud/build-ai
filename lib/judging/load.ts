import "server-only";
import type { Assessment } from "@/lib/ai/schemas/assessment";
import type { ScoredCriterion } from "@/lib/ai/schemas/judge";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeAwards, rankTeams, type Award } from "./awards";

type Admin = ReturnType<typeof createAdminClient>;

export type TeamScore = {
  id: string;
  name: string;
  status: "pending" | "done" | "failed" | "none";
  total: number | null;
  override: number | null;
  final: number;
  breakdown: ScoredCriterion[];
  summary: string;
  assessment: Assessment | null;
};

// Every team's latest score in a session, the leaderboard order, and awards.
// Only finished scores (or facilitator overrides) count towards awards.
export async function loadSessionScores(sessionId: string, admin: Admin = createAdminClient()) {
  const { data: teams } = await admin
    .from("teams")
    .select("id, name, created_at, scores (status, total, facilitator_override, final, breakdown, ai_summary, assessment, created_at)")
    .eq("session_id", sessionId)
    .order("created_at");

  const scores: TeamScore[] = (teams ?? []).map((t) => {
    const latest = [...t.scores].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    return {
      id: t.id,
      name: t.name,
      status: (latest?.status as TeamScore["status"]) ?? "none",
      total: latest?.total ?? null,
      override: latest?.facilitator_override ?? null,
      final: latest?.final ?? 0,
      breakdown: (latest?.breakdown as ScoredCriterion[] | null) ?? [],
      summary: latest?.ai_summary ?? "",
      assessment: (latest?.assessment as Assessment | null) ?? null,
    };
  });

  const counted = scores.filter((s) => s.status === "done" || s.override !== null);
  const awards: Award[] = computeAwards(counted.map((s) => ({ id: s.id, name: s.name, final: s.final, breakdown: s.breakdown })));
  return {
    scores,
    leaderboard: rankTeams(counted),
    awards,
    pending: scores.filter((s) => s.status === "pending").length,
    failed: scores.filter((s) => s.status === "failed").length,
  };
}
