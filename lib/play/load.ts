import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { functionName } from "@/lib/decks/schemas";
import type { CoachCase, CoachDesign, CoachHistoryItem } from "@/lib/coach/context";

export type PlayerTeam = {
  userId: string;
  playerId: string;
  playerName: string;
  session: {
    id: string;
    mode: "live" | "practice";
    phase: string;
    org_id: string;
    deck_id: string | null;
    target_platforms: string[];
    name: string;
    phase_started_at: string | null;
    phase_duration_seconds: number | null;
    settings: unknown;
  };
  team: { id: string; name: string; hint_tokens_remaining: number };
  caseId: string | null;
  case: CoachCase | null;
  design: CoachDesign & { id: string; updated_at: string };
};

// Loads everything a player needs for their team, after checking they really
// are a player on that team. Reads go through the service role so anonymous
// players (milestone 3) work the same way as staff in practice mode; the
// membership check here is what keeps teams apart.
export async function loadPlayerTeam(teamId: string): Promise<PlayerTeam | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const admin = createAdminClient();
  const { data: player } = await admin
    .from("players")
    .select("id, display_name, team_id, session_id")
    .eq("team_id", teamId)
    .eq("user_id", auth.user.id)
    .is("left_at", null)
    .maybeSingle();
  if (!player) return null;

  const [{ data: team }, { data: session }, { data: design }] = await Promise.all([
    admin.from("teams").select("id, name, hint_tokens_remaining, case_id").eq("id", teamId).single(),
    admin.from("sessions").select("id, mode, phase, org_id, deck_id, target_platforms, name, phase_started_at, phase_duration_seconds, settings").eq("id", player.session_id).single(),
    admin
      .from("designs")
      .select("id, trigger, steps, decision, action, human, name, hours_saved_per_month, tools, systems, updated_at")
      .eq("team_id", teamId)
      .order("version", { ascending: false })
      .limit(1)
      .single(),
  ]);
  if (!team || !session || !design) return null;

  let coachCase: CoachCase | null = null;
  if (team.case_id) {
    const { data: c } = await admin.from("cases").select("title, story, cost, who_feels_it, function_slug").eq("id", team.case_id).single();
    if (c) coachCase = { title: c.title, story: c.story, cost: c.cost, who_feels_it: c.who_feels_it, function_name: functionName(c.function_slug) };
  }

  return {
    userId: auth.user.id,
    playerId: player.id,
    playerName: player.display_name,
    session,
    team: { id: team.id, name: team.name, hint_tokens_remaining: team.hint_tokens_remaining },
    caseId: team.case_id,
    case: coachCase,
    design: { ...design, hours_saved_per_month: design.hours_saved_per_month === null ? null : Number(design.hours_saved_per_month) },
  };
}

export async function loadCoachHistory(teamId: string): Promise<(CoachHistoryItem & { id: string; type: string | null; slot: string | null; created_at: string })[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("coach_messages")
    .select("id, role, type, slot, content, created_at")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true })
    .limit(200);
  return data ?? [];
}
