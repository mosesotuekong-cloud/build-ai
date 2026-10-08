import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { canTransition, phaseDurationSeconds, type Phase, type SessionMode } from "./machine";
import { readSettings } from "./settings";

type Admin = ReturnType<typeof createAdminClient>;

export type TransitionResult = { ok: true; phase: Phase } | { ok: false; message: string };

// Moves a session to the next phase. The only code path that changes a
// session's phase. Checks the state machine, applies side effects, and uses
// compare-and-set so two clicks can never advance a room twice.
export async function transitionSession(sessionId: string, to: Phase, admin: Admin = createAdminClient()): Promise<TransitionResult> {
  const { data: session } = await admin.from("sessions").select("id, org_id, deck_id, mode, phase, settings, started_at").eq("id", sessionId).single();
  if (!session) return { ok: false, message: "Session not found." };

  const from = session.phase as Phase;
  const mode = session.mode as SessionMode;
  const settings = readSettings(session.settings);
  if (!canTransition(from, to, settings, mode)) {
    return { ok: false, message: `Can't go from ${from.replace(/_/g, " ")} to ${to.replace(/_/g, " ")}.` };
  }

  // Opening the lobby uses a session credit (live sessions only).
  let creditUsed = false;
  if (mode === "live" && from === "draft" && to === "lobby") {
    const { data: left } = await admin.rpc("consume_session_credit", { target_org: session.org_id });
    if (left === null || left < 0) return { ok: false, message: "Your organisation has no session credits left." };
    creditUsed = true;
  }

  // Teams that haven't picked a case get one dealt before design starts.
  if (mode === "live" && to === "solving") await dealRemainingCases(admin, session.id, session.deck_id);
  // The pre-twist design is saved as a version before the twist lands.
  if (mode === "live" && to === "twist") await admin.rpc("snapshot_designs_for_twist", { target_session: session.id });

  const now = new Date().toISOString();
  const { data: moved } = await admin
    .from("sessions")
    .update({
      phase: to,
      phase_started_at: now,
      phase_duration_seconds: phaseDurationSeconds(to, settings),
      started_at: session.started_at ?? (from === "lobby" ? now : null),
      ended_at: to === "closed" ? now : null,
    })
    .eq("id", session.id)
    .eq("phase", from)
    .select("phase")
    .maybeSingle();

  if (!moved) {
    if (creditUsed) {
      const { data: org } = await admin.from("organizations").select("session_credits").eq("id", session.org_id).single();
      if (org) await admin.from("organizations").update({ session_credits: org.session_credits + 1 }).eq("id", session.org_id);
    }
    return { ok: false, message: "Someone else just moved this session on. Refresh to see where it is." };
  }

  if (mode === "live" && to === "twist" && settings.twist_bonus_tokens > 0) {
    await admin.rpc("add_session_tokens", { target_session: session.id, amount: settings.twist_bonus_tokens });
  }
  return { ok: true, phase: to };
}

// Adds time to the current phase's timer.
export async function extendPhase(sessionId: string, seconds: number, admin: Admin = createAdminClient()) {
  const { data: s } = await admin.from("sessions").select("phase_started_at, phase_duration_seconds").eq("id", sessionId).single();
  if (!s?.phase_started_at) return;
  const elapsed = Math.floor((Date.now() - new Date(s.phase_started_at).getTime()) / 1000);
  // A timer that has already run out restarts from now.
  const base = Math.max(s.phase_duration_seconds ?? 0, elapsed);
  await admin.from("sessions").update({ phase_duration_seconds: base + seconds }).eq("id", sessionId);
}

// Gives every team without a case one from the deck, preferring cases no
// other team has, then reusing cases if there are more teams than cases.
export async function dealRemainingCases(admin: Admin, sessionId: string, deckId: string | null) {
  if (!deckId) return;
  const [{ data: teams }, { data: cases }] = await Promise.all([
    admin.from("teams").select("id, case_id, created_at").eq("session_id", sessionId).order("created_at"),
    admin.from("cases").select("id").eq("deck_id", deckId).order("position"),
  ]);
  if (!teams?.length || !cases?.length) return;

  const taken = new Map<string, number>();
  for (const t of teams) if (t.case_id) taken.set(t.case_id, (taken.get(t.case_id) ?? 0) + 1);
  for (const team of teams.filter((t) => !t.case_id)) {
    const pick = [...cases].sort((a, b) => (taken.get(a.id) ?? 0) - (taken.get(b.id) ?? 0))[0];
    taken.set(pick.id, (taken.get(pick.id) ?? 0) + 1);
    await admin.from("teams").update({ case_id: pick.id }).eq("id", team.id);
  }
}

// Creates a team with its first design row and the session's starting tokens.
export async function createTeam(admin: Admin, sessionId: string, name: string, hintTokens: number, phase: Phase) {
  const { data: team, error } = await admin.from("teams").insert({ session_id: sessionId, name, hint_tokens_remaining: hintTokens }).select("id").single();
  if (error || !team) throw new Error("Could not create the team.");
  const versions: ("before_twist" | "after_twist")[] = ["twist", "solving_after_twist"].includes(phase) ? ["before_twist", "after_twist"] : ["before_twist"];
  await admin.from("designs").insert(versions.map((version) => ({ team_id: team.id, version })));
  return team.id;
}
