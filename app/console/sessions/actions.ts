"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { judgeSession, scoreChecks, writeReferenceSolutions } from "@/lib/judging/run";
import { generateBlueprints } from "@/lib/export/run";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireFacilitator } from "@/lib/auth/facilitator";
import { generateJoinCode } from "@/lib/session/codes";
import { nextPhase, PHASES, type Phase } from "@/lib/session/machine";
import { extendPhase, transitionSession } from "@/lib/session/server";
import { readSettings, sessionSettingsSchema } from "@/lib/session/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.uuid();

// Confirms the signed-in facilitator is staff for this session (RLS decides
// what they can read), and returns it.
async function staffSession(sessionId: string) {
  await requireFacilitator();
  const supabase = await createClient();
  const { data } = await supabase.from("sessions").select("id, org_id, deck_id, phase, settings, mode").eq("id", idSchema.parse(sessionId)).maybeSingle();
  if (!data) throw new Error("Session not found.");
  return data;
}

export type CreateSessionState = { status: "idle" | "error"; message?: string };

export async function createSession(_prev: CreateSessionState, formData: FormData): Promise<CreateSessionState> {
  const ctx = await requireFacilitator();
  if (!ctx.activeOrg) return { status: "error", message: "You need an organisation to run sessions." };

  const name = String(formData.get("name") ?? "").trim();
  const deckId = String(formData.get("deck_id") ?? "");
  if (name.length < 2 || name.length > 120) return { status: "error", message: "Give the session a name of 2 to 120 characters." };
  if (!idSchema.safeParse(deckId).success) return { status: "error", message: "Pick a deck." };

  const number = (key: string) => (formData.get(key) === null || formData.get(key) === "" ? undefined : Number(formData.get(key)));
  const settings = sessionSettingsSchema.safeParse({
    hint_tokens: number("hint_tokens"),
    twist_bonus_tokens: number("twist_bonus_tokens"),
    coach_enabled: formData.get("coach_enabled") === "on",
    inline_coach: formData.get("inline_coach") === "on",
    inline_idle_minutes: number("inline_idle_minutes"),
    earn_back_cap: number("earn_back_cap"),
    twist_enabled: formData.get("twist_enabled") === "on",
    before_after_check: formData.get("before_after_check") === "on",
    case_mode: formData.get("case_mode") ?? undefined,
    function_mode: formData.get("function_mode") ?? undefined,
    minutes: { solving: number("minutes_solving"), solving_after_twist: number("minutes_after_twist") },
  });
  if (!settings.success) return { status: "error", message: "Some settings are out of range. Check the numbers." };

  // The user's client confirms the deck is theirs (or the library).
  const supabase = await createClient();
  const { data: deck } = await supabase.from("decks").select("id, target_platforms").eq("id", deckId).maybeSingle();
  if (!deck) return { status: "error", message: "We couldn't find that deck." };

  const admin = createAdminClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: session, error } = await admin
      .from("sessions")
      .insert({
        org_id: ctx.activeOrg.orgId,
        deck_id: deck.id,
        mode: "live",
        name,
        phase: "draft",
        settings: settings.data,
        target_platforms: deck.target_platforms.length ? deck.target_platforms : ctx.activeOrg.aiStack,
        join_code: generateJoinCode(),
        created_by: ctx.userId,
      })
      .select("id")
      .single();
    if (session) {
      revalidatePath("/console/sessions");
      redirect(`/console/sessions/${session.id}`);
    }
    if (error && !error.message.includes("join_code")) break; // only retry code clashes
  }
  return { status: "error", message: "We couldn't create the session. Please try again." };
}

export async function advanceSession(sessionId: string, to: string): Promise<{ ok: boolean; message?: string }> {
  const session = await staffSession(sessionId);
  const target = z.enum(PHASES).parse(to) as Phase;
  const result = await transitionSession(session.id, target);
  // Slow AI work runs after the response, so the room moves on at once and
  // screens update live as results land.
  if (result.ok) {
    if (target === "judging") after(() => Promise.all([judgeSession(session.id), scoreChecks(session.id, "baseline")]));
    if (target === "reveal") after(() => Promise.all([writeReferenceSolutions(session.id), generateBlueprints(session.id)]));
    if (target === "commitments") after(() => scoreChecks(session.id, "post"));
  }
  revalidatePath(`/console/sessions/${session.id}`);
  return result.ok ? { ok: true } : { ok: false, message: result.message };
}

// Convenience for the big "next" button: always moves to the machine's next phase.
export async function advanceToNext(sessionId: string) {
  const session = await staffSession(sessionId);
  const next = nextPhase(session.phase as Phase, readSettings(session.settings));
  if (!next) return { ok: false, message: "This session has ended." };
  return advanceSession(sessionId, next);
}

export async function addTime(sessionId: string, minutes: number) {
  const session = await staffSession(sessionId);
  await extendPhase(session.id, Math.round(z.number().min(1).max(30).parse(minutes) * 60));
  revalidatePath(`/console/sessions/${session.id}`);
}

export async function endSession(sessionId: string) {
  return advanceSession(sessionId, "closed");
}

export async function deleteDraft(sessionId: string) {
  const session = await staffSession(sessionId);
  if (session.phase !== "draft") throw new Error("Only drafts can be deleted.");
  await createAdminClient().from("sessions").delete().eq("id", session.id).eq("phase", "draft");
  revalidatePath("/console/sessions");
  redirect("/console/sessions");
}

// The facilitator gives a team a case (or changes it) before design starts.
export async function assignCase(sessionId: string, teamId: string, caseId: string) {
  const session = await staffSession(sessionId);
  if (!["draft", "lobby", "baseline_check"].includes(session.phase)) throw new Error("Cases are fixed once design starts.");
  const admin = createAdminClient();
  const { data: c } = await admin
    .from("cases")
    .select("id")
    .eq("id", idSchema.parse(caseId))
    .eq("deck_id", session.deck_id!)
    .or(`session_id.is.null,session_id.eq.${session.id}`)
    .maybeSingle();
  if (!c) throw new Error("That case isn't in this session's deck.");
  await admin.from("teams").update({ case_id: c.id }).eq("id", idSchema.parse(teamId)).eq("session_id", session.id);
  revalidatePath(`/console/sessions/${session.id}`);
}

// The facilitator's override for a team's score. Both the AI's score and the
// override are kept; the final score uses the override.
export async function overrideScore(sessionId: string, teamId: string, value: number | null) {
  const session = await staffSession(sessionId);
  const override = value === null ? null : z.number().int().min(0).max(100).parse(value);
  const admin = createAdminClient();
  const { data: team } = await admin.from("teams").select("id").eq("id", idSchema.parse(teamId)).eq("session_id", session.id).maybeSingle();
  if (!team) throw new Error("Team not found.");
  const { data: existing } = await admin.from("scores").select("id").eq("team_id", team.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (existing) await admin.from("scores").update({ facilitator_override: override }).eq("id", existing.id);
  else if (override !== null) await admin.from("scores").insert({ team_id: team.id, design_version: "before_twist", status: "done", facilitator_override: override, ai_summary: "Scored by the facilitator." });
  revalidatePath(`/console/sessions/${session.id}`);
}

// Re-runs judging for teams the AI couldn't score.
export async function retryJudging(sessionId: string) {
  const session = await staffSession(sessionId);
  after(() => judgeSession(session.id, { onlyUnscored: true }));
  revalidatePath(`/console/sessions/${session.id}`);
}
