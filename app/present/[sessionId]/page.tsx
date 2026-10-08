import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { requireFacilitator } from "@/lib/auth/facilitator";
import { CANVAS_SLOTS } from "@/lib/ai/schemas/canvas";
import { createClient } from "@/lib/supabase/server";
import { PresenterScreen } from "./presenter-screen";

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
