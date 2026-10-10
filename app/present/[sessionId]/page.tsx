import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { requireFacilitator } from "@/lib/auth/facilitator";
import { CANVAS_SLOTS } from "@/lib/ai/schemas/canvas";
import { createClient } from "@/lib/supabase/server";
import { PresenterScreen } from "./presenter-screen";
import { loadSessionScores } from "@/lib/judging/load";

export const metadata: Metadata = { title: "Presenter" };

// The projector view. Read-only: phase, timer, join code, teams and their
// progress. Opened by the facilitator, so it uses their sign-in.
export default async function PresentPage({ params }: PageProps<"/present/[sessionId]">) {
  const { sessionId } = await params;
  await requireFacilitator();
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("id, name, phase, phase_started_at, phase_duration_seconds, join_code, mode")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.mode !== "live") notFound();

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, created_at, players (display_name, left_at), designs (version, trigger, steps, decision, action, human), twists (content)")
    .eq("session_id", session.id)
    .order("created_at");
  const results = ["prioritise", "judging", "reveal", "post_check", "commitments", "report", "closed"].includes(session.phase) ? await loadSessionScores(session.id) : null;
  const { data: commitments } =
    session.phase === "commitments" ? await supabase.from("commitments").select("team_id, first_step, due_date").eq("session_id", session.id) : { data: [] };

  return (
    <PresenterScreen
      session={{
        id: session.id,
        name: session.name,
        phase: session.phase,
        startedAt: session.phase_started_at,
        duration: session.phase_duration_seconds,
        joinCode: session.join_code,
      }}
      joinHost={(await headers()).get("host") ?? "localhost:3000"}
      results={
        results
          ? {
              leaderboard: results.leaderboard.map((s) => ({ id: s.id, name: s.name, final: s.final })),
              awards: results.awards,
              done: results.scores.filter((s) => s.status === "done").length,
              total: results.scores.length,
            }
          : null
      }
      pledges={(commitments ?? []).map((c) => ({
        teamName: (teams ?? []).find((t) => t.id === c.team_id)?.name ?? "A team",
        first_step: c.first_step,
        due_date: c.due_date,
      }))}
      serverNow={new Date().toISOString()}
      teams={(teams ?? []).map((t) => {
        const design = t.designs.find((d) => d.version === "after_twist") ?? t.designs[0];
        return {
          id: t.id,
          name: t.name,
          players: t.players.filter((p) => !p.left_at).length,
          twist: t.twists?.content ?? null,
          filled: Object.fromEntries(CANVAS_SLOTS.map((s) => [s, Boolean(design?.[s]?.trim())])),
        };
      })}
    />
  );
}
