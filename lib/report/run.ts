import "server-only";
import { aiForSession } from "@/lib/ai/for-org";
import type { Assessment } from "@/lib/ai/schemas/assessment";
import type { CheckKind } from "@/lib/ai/schemas/check";
import type { ScoredCriterion } from "@/lib/ai/schemas/judge";
import { functionName } from "@/lib/decks/schemas";
import { readSettings } from "@/lib/session/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildOpportunityMap, type ReportInput } from "./map";
import { writeReportProse } from "./prose";

type Admin = ReturnType<typeof createAdminClient>;

// Gathers everything the report needs from the session, in one place.
export async function loadReportInput(sessionId: string, admin: Admin = createAdminClient()): Promise<(ReportInput & { orgId: string }) | null> {
  const { data: session } = await admin
    .from("sessions")
    .select("id, name, org_id, started_at, created_at, target_platforms, settings, organizations (name)")
    .eq("id", sessionId)
    .single();
  if (!session) return null;

  const [{ data: teams }, { data: ideas }, { data: checks }] = await Promise.all([
    admin
      .from("teams")
      .select(
        "id, name, created_at, players (id, left_at), cases (title, function_slug, session_id), designs (*), scores (final, breakdown, status, facilitator_override, assessment, created_at), commitments (owner_name, first_step, due_date), design_checks (flags, created_at), coach_messages (role, slot, trigger)",
      )
      .eq("session_id", sessionId)
      .order("created_at"),
    admin.from("ideas").select("title, what_happens, who_feels_it, frequency, status").eq("session_id", sessionId).order("created_at"),
    admin.from("individual_checks").select("player_id, kind, total, breakdown").eq("session_id", sessionId),
  ]);

  return {
    orgId: session.org_id,
    session: {
      name: session.name || "Workshop",
      date: session.started_at ?? session.created_at,
      orgName: session.organizations?.name ?? "",
      platforms: session.target_platforms ?? [],
      beforeAfter: readSettings(session.settings).before_after_check,
    },
    teams: (teams ?? []).map((t) => {
      const design = t.designs.find((d) => d.version === "after_twist") ?? t.designs.find((d) => d.version === "before_twist") ?? null;
      const score = [...t.scores].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      const counted = score && (score.status === "done" || score.facilitator_override !== null);
      const firstCheck = [...t.design_checks].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
      const commitment = Array.isArray(t.commitments) ? t.commitments[0] : t.commitments;
      const asked = t.coach_messages.filter((m) => m.role === "team" && m.trigger === "asked");
      return {
        id: t.id,
        name: t.name,
        players: t.players.length,
        case: t.cases ? { title: t.cases.title, function_name: functionName(t.cases.function_slug), source: t.cases.session_id ? ("raised" as const) : ("deck" as const) } : null,
        design: design
          ? {
              trigger: design.trigger,
              steps: design.steps,
              decision: design.decision,
              action: design.action,
              human: design.human,
              name: design.name,
              hours_saved_per_month: design.hours_saved_per_month === null ? null : Number(design.hours_saved_per_month),
              tools: design.tools,
              systems: design.systems,
              impact: design.impact,
              effort: design.effort,
              frequency: design.frequency,
              volume_per_month: design.volume_per_month,
              data_location: design.data_location,
              data_access: design.data_access,
              data_quality: design.data_quality,
              personal_data: design.personal_data,
              risks: design.risks,
              ai_kind: design.ai_kind,
              platform_fit: design.platform_fit,
            }
          : null,
        score: counted ? { final: score.final ?? 0, breakdown: (score.breakdown as ScoredCriterion[] | null) ?? [] } : null,
        assessment: (score?.assessment as Assessment | null) ?? null,
        commitment: commitment ? { owner_name: commitment.owner_name, first_step: commitment.first_step, due_date: commitment.due_date } : null,
        firstFlags: ((firstCheck?.flags as { kind: CheckKind }[] | null) ?? []).map((f) => f.kind),
        coachQuestions: asked.length,
        coachSlots: t.coach_messages.filter((m) => m.role === "coach" && m.slot).map((m) => m.slot!),
      };
    }),
    ideas: (ideas ?? []).map((i) => ({ ...i, status: i.status as "raised" | "designed" })),
    checks: (checks ?? []).map((c) => ({ playerId: c.player_id, kind: c.kind, total: c.total, breakdown: (c.breakdown as ScoredCriterion[] | null) ?? null })),
  };
}

// Builds the opportunity map and writes its prose. Runs in the background
// when the session reaches the report phase, and again on request. If the
// prose can't be written by the AI, templates write it, so a report is
// always produced.
export async function generateReport(sessionId: string, admin: Admin = createAdminClient()) {
  const input = await loadReportInput(sessionId, admin);
  if (!input) return;
  await admin.from("reports").upsert({ session_id: sessionId, org_id: input.orgId, status: "pending" }, { onConflict: "session_id" });
  try {
    const map = buildOpportunityMap(input);
    const { prose, source } = await writeReportProse(await aiForSession(sessionId, 1, admin), map);
    await admin
      .from("reports")
      .update({ status: "done", map, prose, prose_source: source, generated_at: new Date().toISOString() })
      .eq("session_id", sessionId);
  } catch (error) {
    console.error(`Report failed for session ${sessionId}:`, error instanceof Error ? error.message : error);
    await admin.from("reports").update({ status: "failed" }).eq("session_id", sessionId);
  }
}
