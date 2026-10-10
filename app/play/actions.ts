"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aiForOrg } from "@/lib/ai/for-org";
import { judgeDesign, writeReferenceSolution } from "@/lib/ai/tasks/judge-design";
import { generateBlueprints } from "@/lib/export/run";
import type { ScoredCriterion, ReferenceSolution } from "@/lib/ai/schemas/judge";
import { requireFacilitator } from "@/lib/auth/facilitator";
import { designPatchSchema, type DesignPatch } from "@/lib/play/design";
import { loadPlayerTeam } from "@/lib/play/load";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { designSaveTargets, type Phase } from "@/lib/session/machine";
import { transitionSession } from "@/lib/session/server";
import { readSettings } from "@/lib/session/settings";

const idSchema = z.uuid();

// Starts (or resumes) a practice run of one case for the signed-in
// facilitator: a one-player, facilitator-less session in the solving phase.
export async function startPractice(caseId: string) {
  const ctx = await requireFacilitator();
  if (!ctx.activeOrg) throw new Error("You need an organisation to practise.");
  const supabase = await createClient();

  // Reading through the user's client checks they may see this case.
  const { data: c } = await supabase
    .from("cases")
    .select("id, title, deck_id, decks (target_platforms)")
    .eq("id", idSchema.parse(caseId))
    .single();
  if (!c) throw new Error("Case not found.");

  const admin = createAdminClient();

  // Resume an unfinished practice run of the same case, if there is one.
  const { data: existing } = await admin
    .from("teams")
    .select("id, sessions!inner (id, mode, phase, created_by)")
    .eq("case_id", c.id)
    .eq("sessions.mode", "practice")
    .eq("sessions.created_by", ctx.userId)
    .eq("sessions.phase", "solving")
    .limit(1)
    .maybeSingle();
  if (existing) redirect(`/play/${existing.id}`);

  const platforms = c.decks?.target_platforms.length ? c.decks.target_platforms : ctx.activeOrg.aiStack;
  const { data: session, error } = await admin
    .from("sessions")
    .insert({
      org_id: ctx.activeOrg.orgId,
      deck_id: c.deck_id,
      mode: "practice",
      name: `Practice: ${c.title}`.slice(0, 120),
      phase: "solving",
      phase_started_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      settings: { hint_tokens: 3 },
      target_platforms: platforms,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error || !session) throw new Error("Could not start the practice run.");

  const { data: team } = await admin.from("teams").insert({ session_id: session.id, name: "You", case_id: c.id, hint_tokens_remaining: 3 }).select("id").single();
  if (!team) throw new Error("Could not create the team.");
  await admin.from("players").insert({ session_id: session.id, team_id: team.id, user_id: ctx.userId, display_name: ctx.email.split("@")[0].slice(0, 60) });
  await admin.from("designs").insert({ team_id: team.id, version: "before_twist" });

  redirect(`/play/${team.id}`);
}

// Autosave, to the current version (after the twist, the after-twist copy).
// Only in design phases, plus a short grace period after the canvas locks so
// a last edit is never lost. Goes through the player's own client, so RLS
// only lets team players change their design.
export async function saveDesign(
  teamId: string,
  patch: DesignPatch,
): Promise<{ ok: boolean; savedAt?: string; locked?: boolean }> {
  const parsed = designPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false };
  const data_ = await loadPlayerTeam(idSchema.parse(teamId));
  if (!data_) return { ok: false };
  const targets = designSaveTargets(data_.session.phase as Phase, data_.session.phase_started_at);
  if (targets.length === 0) return { ok: false, locked: true };
  const supabase = await createClient();
  let savedAt: string | undefined;
  for (const target of targets) {
    const query = supabase.from("designs").update(parsed.data).eq("team_id", data_.team.id);
    const { data, error } = await (target === "current" ? query.eq("id", data_.design.id) : query.eq("version", target)).select("updated_at").maybeSingle();
    if (error) return { ok: false };
    savedAt = data?.updated_at ?? savedAt;
  }
  if (!savedAt) return { ok: false };

  return { ok: true, savedAt };
}

export type FinishResult =
  | {
      ok: true;
      score: { total: number; breakdown: ScoredCriterion[]; summary: string } | null;
      reference: ReferenceSolution | null;
    }
  | { ok: false; message: string };

// Ends a practice run: scores the design and reveals the model answer.
// Either part can fail on its own without losing the other.
export async function finishPractice(teamId: string): Promise<FinishResult> {
  const data = await loadPlayerTeam(idSchema.parse(teamId));
  if (!data || !data.case || !data.caseId) return { ok: false, message: "We couldn't find your practice run." };
  if (data.session.mode !== "practice") return { ok: false, message: "Only practice runs can be finished this way." };

  const admin = createAdminClient();
  // Scoring plus the model answer.
  const provider = await aiForOrg(data.session.org_id, 2, admin);

  const scorePromise = judgeDesign(provider, { case: data.case, design: data.design })
    .then(async (result) => {
      await admin.from("scores").upsert(
        { team_id: data.team.id, design_version: "before_twist", breakdown: result.breakdown, total: result.total, ai_summary: result.summary, status: "done" },
        { onConflict: "team_id,design_version" },
      );
      return result;
    })
    .catch((error) => {
      console.error("Judging failed", error instanceof Error ? error.message : error);
      return null;
    });

  const referencePromise = (async () => {
    const { data: cached } = await admin.from("reference_solutions").select("trigger, steps, decision, action, human, explanation").eq("case_id", data.caseId!).maybeSingle();
    if (cached) return cached;
    const { data: deck } = await admin.from("cases").select("decks (tools)").eq("id", data.caseId!).single();
    const solution = await writeReferenceSolution(provider, { case: data.case!, companyTools: deck?.decks?.tools ?? [] });
    await admin.from("reference_solutions").upsert({ case_id: data.caseId!, ...solution }, { onConflict: "case_id", ignoreDuplicates: true });
    return solution;
  })().catch((error) => {
    console.error("Model answer failed", error instanceof Error ? error.message : error);
    return null;
  });

  const [score, reference] = await Promise.all([scorePromise, referencePromise]);
  await transitionSession(data.session.id, "reveal", admin);
  // The take-home files are written after the response. A blueprint from an
  // earlier version of the design is marked pending first, so it's never
  // downloaded by mistake.
  await admin.from("blueprints").update({ status: "pending" }).eq("team_id", data.team.id).neq("design_updated_at", data.design.updated_at);
  after(() => generateBlueprints(data.session.id, { teamId: data.team.id }));
  return { ok: true, score, reference };
}

// Lets the player keep improving after seeing the score.
export async function reopenPractice(teamId: string) {
  const data = await loadPlayerTeam(idSchema.parse(teamId));
  if (!data || data.session.mode !== "practice") return;
  await transitionSession(data.session.id, "solving");
}

// A team picks its case in the lobby (or before design starts). With a
// mixed-function deck in "pick a function" mode, the picker filters by
// function first; any team member can pick, and can change it until design starts.
export async function pickCase(teamId: string, caseId: string): Promise<{ ok: boolean; message?: string }> {
  const data = await loadPlayerTeam(idSchema.parse(teamId));
  if (!data) return { ok: false, message: "You're not on this team." };
  if (!["lobby", "baseline_check"].includes(data.session.phase)) return { ok: false, message: "Cases are fixed once design starts." };
  const admin = createAdminClient();
  const { data: session } = await admin.from("sessions").select("settings, deck_id").eq("id", data.session.id).single();
  if (readSettings(session?.settings).case_mode !== "teams_pick") return { ok: false, message: "Your facilitator is handing out the cases." };
  const { data: c } = await admin
    .from("cases")
    .select("id")
    .eq("id", idSchema.parse(caseId))
    .eq("deck_id", session!.deck_id!)
    .or(`session_id.is.null,session_id.eq.${data.session.id}`)
    .maybeSingle();
  if (!c) return { ok: false, message: "That case isn't in this session's deck." };
  await admin.from("teams").update({ case_id: c.id }).eq("id", data.team.id);
  return { ok: true };
}
