"use server";

import { z } from "zod";
import { isValidJoinCode, normaliseJoinCode } from "@/lib/session/codes";
import type { Phase } from "@/lib/session/machine";
import { createTeam } from "@/lib/session/server";
import { readSettings } from "@/lib/session/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Phases a player can still join in. Late joiners are welcome until judging.
const JOINABLE: ReadonlySet<Phase> = new Set(["lobby", "baseline_check", "solving", "twist", "solving_after_twist"]);

export async function findOpenSession(rawCode: string) {
  const code = normaliseJoinCode(rawCode);
  if (!isValidJoinCode(code)) return null;
  const { data } = await createAdminClient().from("sessions").select("id, name, phase").eq("join_code", code).neq("phase", "closed").maybeSingle();
  if (!data || !JOINABLE.has(data.phase as Phase)) return null;
  return { ...data, code };
}

const joinSchema = z.object({
  code: z.string(),
  displayName: z.string().trim().min(1, "Tell us your name.").max(40, "Keep your name under 40 characters."),
  teamId: z.uuid().optional(),
  newTeamName: z.string().trim().min(1).max(40).optional(),
});

export type JoinResult = { ok: true; teamId: string } | { ok: false; message: string };

// Puts the signed-in player (anonymous, or staff testing) on a team. The
// player's name stays in our database; it never goes to the AI.
export async function joinSession(input: z.input<typeof joinSchema>): Promise<JoinResult> {
  const parsed = joinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check your details." };
  const { displayName, teamId, newTeamName } = parsed.data;
  if (!teamId && !newTeamName) return { ok: false, message: "Join a team or start a new one." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: "Your browser blocked sign-in. Refresh and try again." };

  const session = await findOpenSession(parsed.data.code);
  if (!session) return { ok: false, message: "That code isn't open for joining. Check it with your facilitator." };

  const admin = createAdminClient();
  const { data: full } = await admin.from("sessions").select("id, phase, settings").eq("id", session.id).single();
  if (!full) return { ok: false, message: "That session has just closed." };

  let targetTeam = teamId;
  if (targetTeam) {
    const { data: team } = await admin.from("teams").select("id").eq("id", targetTeam).eq("session_id", full.id).maybeSingle();
    if (!team) return { ok: false, message: "That team isn't in this session." };
  } else {
    const { data: clash } = await admin.from("teams").select("id").eq("session_id", full.id).ilike("name", newTeamName!).maybeSingle();
    if (clash) return { ok: false, message: "A team with that name already exists. Join it, or pick another name." };
    targetTeam = await createTeam(admin, full.id, newTeamName!, readSettings(full.settings).hint_tokens, full.phase as Phase);
  }

  const { error } = await admin
    .from("players")
    .upsert(
      { session_id: full.id, team_id: targetTeam, user_id: auth.user.id, display_name: displayName, left_at: null },
      { onConflict: "session_id,user_id" },
    );
  if (error) return { ok: false, message: "We couldn't add you. Please try again." };
  return { ok: true, teamId: targetTeam! };
}
