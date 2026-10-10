import "server-only";
import { fixSchema, type Oversight } from "@/lib/ai/schemas/canvas";
import { aiForSession } from "@/lib/ai/for-org";
import { assessUseCase, checkScoreFrom, judgeDesign, writeReferenceSolution } from "@/lib/ai/tasks/judge-design";
import { getCheckCard } from "@/lib/checks/cards";
import type { CoachCase, CoachDesign } from "@/lib/coach/context";
import { functionName } from "@/lib/decks/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    return fn();
  }
}

const toDesign = (d: Record<string, unknown> | undefined): CoachDesign => ({
  trigger: String(d?.trigger ?? ""),
  steps: String(d?.steps ?? ""),
  decision: String(d?.decision ?? ""),
  action: String(d?.action ?? ""),
  human: String(d?.human ?? ""),
  name: String(d?.name ?? ""),
  hours_saved_per_month: d?.hours_saved_per_month === null || d?.hours_saved_per_month === undefined ? null : Number(d.hours_saved_per_month),
  tools: (d?.tools as string[]) ?? [],
  systems: (d?.systems as string[]) ?? [],
  oversight: (d?.oversight as Oversight | null) ?? null,
  fix: fixSchema.safeParse(d?.fix).data ?? null,
});

// Judges every team in the session, in parallel. Each team gets a "pending"
// score row straight away (so the console can show progress), then the
// rubric score and the AI's discovery assessment. One retry each; a team the
// AI can't judge is marked "failed" so the facilitator can score it by hand.
export async function judgeSession(sessionId: string, { onlyUnscored = false } = {}, admin: Admin = createAdminClient()) {
  const { data: session } = await admin.from("sessions").select("target_platforms").eq("id", sessionId).single();
  const { data: teams } = await admin
    .from("teams")
    .select("id, cases (title, story, cost, who_feels_it, function_slug), designs (*), twists (content), scores (status)")
    .eq("session_id", sessionId);
  if (!teams?.length) return;
  // A score and an assessment per team.
  const provider = await aiForSession(sessionId, teams.length * 2, admin);

  await Promise.all(
    teams
      .filter((t) => t.cases && !(onlyUnscored && t.scores.some((s) => s.status === "done")))
      .map(async (team) => {
        const latest = team.designs.find((d) => d.version === "after_twist") ?? team.designs.find((d) => d.version === "before_twist");
        const version = latest?.version ?? "before_twist";
        await admin
          .from("scores")
          .upsert({ team_id: team.id, design_version: version, status: "pending", breakdown: null, total: null, ai_summary: "", assessment: null }, { onConflict: "team_id,design_version" });

        const c = team.cases!;
        const coachCase: CoachCase = { title: c.title, story: c.story, cost: c.cost, who_feels_it: c.who_feels_it, function_name: functionName(c.function_slug) };
        const design = toDesign(latest as unknown as Record<string, unknown>);
        const twist = team.twists?.content ?? null;

        const [score, assessment] = await Promise.allSettled([
          withRetry(() => judgeDesign(provider, { case: coachCase, design, twist })),
          withRetry(() => assessUseCase(provider, { case: coachCase, design, twist, platforms: session?.target_platforms ?? [] })),
        ]);

        if (score.status === "fulfilled") {
          await admin
            .from("scores")
            .update({
              status: "done",
              breakdown: score.value.breakdown,
              total: score.value.total,
              ai_summary: score.value.summary,
              assessment: assessment.status === "fulfilled" ? assessment.value : null,
            })
            .eq("team_id", team.id)
            .eq("design_version", version);
        } else {
          console.error(`Judging failed for team ${team.id}:`, score.reason instanceof Error ? score.reason.message : score.reason);
          await admin
            .from("scores")
            .update({ status: "failed", assessment: assessment.status === "fulfilled" ? assessment.value : null })
            .eq("team_id", team.id)
            .eq("design_version", version);
        }
      }),
  );
}

// Writes the model answer for every case in play, once per case (cached).
// Model answers are only ever generated at the reveal.
export async function writeReferenceSolutions(sessionId: string, admin: Admin = createAdminClient()) {
  const { data: teams } = await admin.from("teams").select("case_id, cases (id, title, story, cost, who_feels_it, function_slug, decks (tools))").eq("session_id", sessionId);
  const cases = new Map<string, NonNullable<NonNullable<typeof teams>[number]["cases"]>>();
  for (const t of teams ?? []) if (t.cases) cases.set(t.cases.id, t.cases);
  if (!cases.size) return;

  const { data: cached } = await admin.from("reference_solutions").select("case_id").in("case_id", [...cases.keys()]);
  const done = new Set((cached ?? []).map((r) => r.case_id));
  const provider = await aiForSession(sessionId, cases.size - done.size, admin);

  await Promise.all(
    [...cases.values()]
      .filter((c) => !done.has(c.id))
      .map(async (c) => {
        try {
          const solution = await withRetry(() =>
            writeReferenceSolution(provider, {
              case: { title: c.title, story: c.story, cost: c.cost, who_feels_it: c.who_feels_it, function_name: functionName(c.function_slug) },
              companyTools: c.decks?.tools ?? [],
            }),
          );
          await admin.from("reference_solutions").upsert({ case_id: c.id, ...solution }, { onConflict: "case_id", ignoreDuplicates: true });
        } catch (error) {
          console.error(`Model answer failed for case ${c.id}:`, error instanceof Error ? error.message : error);
        }
      }),
  );
}

// Scores the solo warm-up or final rounds with the same rubric (hours left
// out, scaled to 100). Only rounds with something written are scored.
export async function scoreChecks(sessionId: string, kind: "baseline" | "post", admin: Admin = createAdminClient()) {
  const { data: checks } = await admin
    .from("individual_checks")
    .select("id, card_id, trigger, steps, decision, action, human, total")
    .eq("session_id", sessionId)
    .eq("kind", kind)
    .is("total", null);
  const provider = await aiForSession(sessionId, checks?.length ?? 0, admin);

  await Promise.all(
    (checks ?? [])
      .filter((c) => [c.trigger, c.steps, c.decision, c.action, c.human].some((s) => s.trim()))
      .map(async (check) => {
        const card = getCheckCard(check.card_id);
        if (!card) return;
        try {
          const result = await withRetry(() =>
            judgeDesign(provider, {
              case: { title: card.title, story: card.story, cost: "", who_feels_it: "", function_name: card.area },
              design: { ...toDesign(check as unknown as Record<string, unknown>), hours_saved_per_month: null },
            }),
          );
          await admin
            .from("individual_checks")
            .update({ breakdown: result.breakdown, total: checkScoreFrom(result.breakdown), ai_summary: result.summary })
            .eq("id", check.id);
        } catch (error) {
          console.error(`Scoring a ${kind} check failed:`, error instanceof Error ? error.message : error);
        }
      }),
  );
}
