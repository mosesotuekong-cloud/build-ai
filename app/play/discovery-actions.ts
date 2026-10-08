"use server";

import { z } from "zod";
import { assignCheckCard } from "@/lib/checks/cards";
import { scorecardPatchSchema, type ScorecardPatch } from "@/lib/discovery/scorecard";
import { loadPlayerTeam } from "@/lib/play/load";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.uuid();
const RAISE_PHASES = new Set(["lobby", "baseline_check", "solving", "twist", "solving_after_twist", "prioritise"]);

// The team's discovery scorecard, during the prioritise phase. Writes the
// current design version through the player's own client (RLS).
export async function saveScorecard(teamId: string, patch: ScorecardPatch): Promise<{ ok: boolean }> {
  const parsed = scorecardPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false };
  const data = await loadPlayerTeam(idSchema.parse(teamId));
  if (!data || data.session.phase !== "prioritise") return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("designs").update(parsed.data).eq("id", data.design.id);
  return { ok: !error };
}

const ideaSchema = z.object({
  title: z.string().trim().min(3, "Give it a short title.").max(80),
  what_happens: z.string().trim().min(10, "Tell us a little about what happens today.").max(600),
  who_feels_it: z.string().trim().max(200).default(""),
  frequency: z.enum(["daily", "weekly", "monthly", "rarely"]).nullable().default(null),
});
export type IdeaInput = z.input<typeof ideaSchema>;

// "Bring your own problem": any player can raise a problem from their own
// work. It joins the session's backlog as "raised, not yet designed".
export async function raiseIdea(teamId: string, input: IdeaInput): Promise<{ ok: boolean; message?: string }> {
  const parsed = ideaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };
  const data = await loadPlayerTeam(idSchema.parse(teamId));
  if (!data) return { ok: false, message: "You're not on this team." };
  if (!RAISE_PHASES.has(data.session.phase)) return { ok: false, message: "Problems can be raised until the prioritise round ends." };
  const { error } = await createAdminClient()
    .from("ideas")
    .insert({ session_id: data.session.id, team_id: data.team.id, player_id: data.playerId, ...parsed.data });
  return error ? { ok: false, message: "We couldn't save that. Please try again." } : { ok: true };
}

const ownProblemSchema = z.object({
  title: z.string().trim().min(3, "Give it a short title.").max(80),
  story: z.string().trim().min(20, "Tell the story in a sentence or two.").max(900),
  who_feels_it: z.string().trim().max(200).default(""),
  cost: z.string().trim().max(300).default(""),
});
export type OwnProblemInput = z.input<typeof ownProblemSchema>;

// In the lobby, a team can design its own problem instead of a deck case. It
// becomes a case for this session only; the deck itself never changes.
export async function designOwnProblem(teamId: string, input: OwnProblemInput): Promise<{ ok: boolean; message?: string }> {
  const parsed = ownProblemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };
  const data = await loadPlayerTeam(idSchema.parse(teamId));
  if (!data) return { ok: false, message: "You're not on this team." };
  if (data.session.phase !== "lobby") return { ok: false, message: "Your own problem can only be chosen in the lobby." };

  const admin = createAdminClient();
  const { data: deck } = await admin.from("decks").select("id, function_slugs").eq("id", data.session.deck_id!).single();
  if (!deck) return { ok: false, message: "This session has no deck." };

  const { data: created, error } = await admin
    .from("cases")
    .insert({
      deck_id: deck.id,
      session_id: data.session.id,
      function_slug: deck.function_slugs[0] ?? "operations",
      source: "raised",
      position: 1000,
      ...parsed.data,
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false, message: "We couldn't save that. Please try again." };

  await Promise.all([
    admin.from("teams").update({ case_id: created.id }).eq("id", data.team.id),
    admin.from("ideas").insert({
      session_id: data.session.id,
      team_id: data.team.id,
      player_id: data.playerId,
      title: parsed.data.title,
      what_happens: parsed.data.story.slice(0, 600),
      who_feels_it: parsed.data.who_feels_it,
      status: "designed",
      case_id: created.id,
    }),
  ]);
  return { ok: true };
}

const checkSlots = z
  .object({ trigger: z.string().max(600), steps: z.string().max(600), decision: z.string().max(600), action: z.string().max(600), human: z.string().max(600) })
  .partial();

type CheckKind = "baseline" | "post";
const CHECK_PHASE: Record<CheckKind, string> = { baseline: "baseline_check", post: "post_check" };

// The player's solo check for this round, created on first visit with the
// card assigned to them.
export async function ensureCheck(teamId: string, kind: CheckKind) {
  const data = await loadPlayerTeam(idSchema.parse(teamId));
  if (!data || data.session.phase !== CHECK_PHASE[kind]) return null;
  const admin = createAdminClient();
  const card = assignCheckCard(data.playerId, kind);
  await admin
    .from("individual_checks")
    .upsert({ session_id: data.session.id, player_id: data.playerId, kind, card_id: card.id }, { onConflict: "player_id,kind", ignoreDuplicates: true });
  const { data: check } = await admin
    .from("individual_checks")
    .select("id, card_id, trigger, steps, decision, action, human, submitted_at")
    .eq("player_id", data.playerId)
    .eq("kind", kind)
    .single();
  return check;
}

export async function saveCheck(teamId: string, kind: CheckKind, patch: z.input<typeof checkSlots>, submit = false): Promise<{ ok: boolean; message?: string }> {
  const parsed = checkSlots.safeParse(patch);
  if (!parsed.success) return { ok: false };
  const data = await loadPlayerTeam(idSchema.parse(teamId));
  if (!data || data.session.phase !== CHECK_PHASE[kind]) return { ok: false, message: "This round has ended." };
  const { error } = await createAdminClient()
    .from("individual_checks")
    .update({ ...parsed.data, ...(submit ? { submitted_at: new Date().toISOString() } : {}) })
    .eq("player_id", data.playerId)
    .eq("kind", kind)
    .is("submitted_at", null);
  return { ok: !error };
}
