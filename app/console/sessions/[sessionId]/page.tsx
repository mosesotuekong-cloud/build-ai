import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { requireFacilitator } from "@/lib/auth/facilitator";
import { CANVAS_SLOTS, fixSchema, type Oversight } from "@/lib/ai/schemas/canvas";
import { readSettings } from "@/lib/session/settings";
import { createClient } from "@/lib/supabase/server";
import { RunConsole, type RunTeam } from "./run-console";
import { loadSessionScores } from "@/lib/judging/load";
import type { CheckSummary } from "@/components/console/results-panel";

export const metadata: Metadata = { title: "Run session" };

export default async function RunSessionPage({ params }: PageProps<"/console/sessions/[sessionId]">) {
  const { sessionId } = await params;
  const ctx = await requireFacilitator();
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, name, phase, phase_started_at, phase_duration_seconds, settings, join_code, deck_id, mode, decks (name)")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.mode !== "live") notFound();

  const [{ data: teams }, { data: cases }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, case_id, hint_tokens_remaining, created_at, players (id, display_name, left_at), twists (content), design_checks (id, flags, created_at), designs (version, trigger, steps, decision, action, human, name, hours_saved_per_month, tools, systems, updated_at, impact, effort, frequency, volume_per_month, data_location, data_access, data_quality, personal_data, risks, ai_kind, platform_fit, readiness, risk_level, oversight, fix)")
      .eq("session_id", session.id)
      .order("created_at"),
    session.deck_id
      ? supabase.from("cases").select("id, title, function_slug").eq("deck_id", session.deck_id).or(`session_id.is.null,session_id.eq.${session.id}`).order("position")
      : Promise.resolve({ data: [] as { id: string; title: string; function_slug: string }[] }),
  ]);

  const teamIds = (teams ?? []).map((t) => t.id);
  const [{ data: ideas }, { data: checks }, results, { data: commitments }] = await Promise.all([
    supabase.from("ideas").select("id, title, what_happens, who_feels_it, frequency, status, team_id, created_at").eq("session_id", session.id).order("created_at"),
    supabase.from("individual_checks").select("kind, submitted_at, total, breakdown").eq("session_id", session.id),
    loadSessionScores(session.id),
    supabase.from("commitments").select("team_id, owner_name, owner_email, first_step, due_date").eq("session_id", session.id),
  ]);

  // Before-and-after averages, overall and per rubric criterion.
  const summarise = (kind: "baseline" | "post"): CheckSummary => {
    const scored = (checks ?? []).filter((c) => c.kind === kind && c.total !== null);
    const criteria: Record<string, number> = {};
    for (const key of ["trigger", "steps", "decision", "action", "human"]) {
      const values = scored.map((c) => (c.breakdown as { key: string; score: number }[] | null)?.find((b) => b.key === key)?.score).filter((v): v is number => v !== undefined);
      if (values.length) criteria[key] = values.reduce((a, b) => a + b, 0) / values.length;
    }
    return { kind, count: scored.length, average: scored.length ? Math.round(scored.reduce((a, c) => a + (c.total ?? 0), 0) / scored.length) : null, criteria };
  };
  const { data: messages } = teamIds.length
    ? await supabase.from("coach_messages").select("id, team_id, role, type, slot, content, created_at, trigger, token_earned_at").in("team_id", teamIds).order("created_at", { ascending: true }).limit(500)
    : { data: [] };

  const runTeams: RunTeam[] = (teams ?? []).map((t) => {
    const design = [...t.designs].sort((a, b) => (a.version === "after_twist" ? -1 : 1) - (b.version === "after_twist" ? -1 : 1))[0];
    return {
      id: t.id,
      name: t.name,
      caseId: t.case_id,
      tokens: t.hint_tokens_remaining,
      twist: t.twists?.content ?? null,
      checks: t.design_checks.map((c) => ({ id: c.id, flags: (c.flags as { slot: string; kind: string; question: string }[]) ?? [], created_at: c.created_at })),
      players: t.players.filter((p) => !p.left_at).map((p) => p.display_name),
      design: design
        ? {
            ...design,
            hours_saved_per_month: design.hours_saved_per_month === null ? null : Number(design.hours_saved_per_month),
            oversight: (design.oversight as Oversight | null) ?? null,
            fix: fixSchema.safeParse(design.fix).data ?? null,
          }
        : null,
      scorecard: design
        ? {
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
            readiness: design.readiness,
            risk_level: design.risk_level,
          }
        : null,
      filled: Object.fromEntries(CANVAS_SLOTS.map((s) => [s, Boolean(design?.[s]?.trim() || (s === "human" && design?.oversight))])),
      messages: (messages ?? []).filter((m) => m.team_id === t.id).map((m) => ({ id: m.id, role: m.role, type: m.type, slot: m.slot, content: m.content, inline: m.trigger === "inline_idle", earned: Boolean(m.token_earned_at) })),
    };
  });

  return (
    <div className="space-y-6">
      <Link href="/console/sessions" className="text-sm font-semibold text-green-700 hover:underline">
        ← Sessions
      </Link>
      <RunConsole
        session={{
          id: session.id,
          name: session.name,
          phase: session.phase,
          phaseStartedAt: session.phase_started_at,
          phaseDuration: session.phase_duration_seconds,
          joinCode: session.join_code,
          deckName: session.decks?.name ?? "",
          settings: readSettings(session.settings),
        }}
        teams={runTeams}
        results={{
          scores: results.scores,
          awards: results.awards,
          pending: results.pending,
          failed: results.failed,
          checks: [summarise("baseline"), summarise("post")],
          commitments: (commitments ?? []).map((c) => ({
            teamName: (teams ?? []).find((t) => t.id === c.team_id)?.name ?? "A team",
            owner_name: c.owner_name,
            first_step: c.first_step,
            due_date: c.due_date,
            hasEmail: Boolean(c.owner_email),
          })),
        }}
        ideas={(ideas ?? []).map((i) => ({ ...i, teamName: (teams ?? []).find((t) => t.id === i.team_id)?.name ?? null }))}
        checks={{
          baseline: (checks ?? []).filter((c) => c.kind === "baseline" && c.submitted_at).length,
          post: (checks ?? []).filter((c) => c.kind === "post" && c.submitted_at).length,
        }}
        cases={cases ?? []}
        credits={ctx.activeOrg?.sessionCredits ?? 0}
        serverNow={new Date().toISOString()}
        joinHost={(await headers()).get("host") ?? "localhost:3000"}
      />
    </div>
  );
}
