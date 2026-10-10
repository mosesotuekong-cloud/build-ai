import "server-only";
import { aiForSession } from "@/lib/ai/for-org";
import { writeBlueprint } from "@/lib/ai/tasks/blueprint";
import type { CoachDesign } from "@/lib/coach/context";
import { fixSchema, type Oversight } from "@/lib/ai/schemas/canvas";
import { functionName } from "@/lib/decks/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { planFromDesign } from "./from-design";

type Admin = ReturnType<typeof createAdminClient>;

const toDesign = (d: Record<string, unknown>): CoachDesign => ({
  trigger: String(d.trigger ?? ""),
  steps: String(d.steps ?? ""),
  decision: String(d.decision ?? ""),
  action: String(d.action ?? ""),
  human: String(d.human ?? ""),
  name: String(d.name ?? ""),
  hours_saved_per_month: d.hours_saved_per_month == null ? null : Number(d.hours_saved_per_month),
  tools: (d.tools as string[]) ?? [],
  systems: (d.systems as string[]) ?? [],
  oversight: (d.oversight as Oversight | null) ?? null,
  fix: fixSchema.safeParse(d.fix).data ?? null,
});

// Writes a blueprint for every team in the session (or just the given team)
// from its latest design. Runs in the background at the reveal. A team whose
// design hasn't changed since its last blueprint is skipped. If even the
// rule-based plan can't be stored, the row is marked failed.
export async function generateBlueprints(sessionId: string, { teamId }: { teamId?: string } = {}, admin: Admin = createAdminClient()) {
  const { data: session } = await admin.from("sessions").select("target_platforms").eq("id", sessionId).single();
  let query = admin
    .from("teams")
    .select("id, cases (title, story, cost, who_feels_it, function_slug), designs (*), twists (content), blueprints (status, design_updated_at)")
    .eq("session_id", sessionId);
  if (teamId) query = query.eq("id", teamId);
  const { data: teams } = await query;
  const provider = await aiForSession(sessionId, teams?.length ?? 0, admin);

  await Promise.all(
    (teams ?? []).map(async (team) => {
      const latest = team.designs.find((d) => d.version === "after_twist") ?? team.designs.find((d) => d.version === "before_twist");
      if (!team.cases || !latest) return;
      const existing = team.blueprints;
      if (existing?.status === "done" && new Date(existing.design_updated_at).getTime() === new Date(latest.updated_at).getTime()) return;

      const base = { session_id: sessionId, team_id: team.id, design_version: latest.version, design_updated_at: latest.updated_at };
      await admin.from("blueprints").upsert({ ...base, status: "pending", plan: null, source: null }, { onConflict: "team_id" });

      const design = toDesign(latest as unknown as Record<string, unknown>);
      const c = team.cases;
      try {
        const result = await writeBlueprint(provider, {
          case: { title: c.title, story: c.story, cost: c.cost, who_feels_it: c.who_feels_it, function_name: functionName(c.function_slug) },
          design,
          twist: team.twists?.content ?? null,
          platforms: session?.target_platforms ?? [],
        });
        if (result.source === "rules") console.warn(`Blueprint for team ${team.id} used the rule-based plan:`, result.problems.join(" "));
        await admin.from("blueprints").update({ status: "done", plan: result.plan, source: result.source }).eq("team_id", team.id);
      } catch (error) {
        console.error(`Blueprint failed for team ${team.id}:`, error instanceof Error ? error.message : error);
        const { error: saveError } = await admin
          .from("blueprints")
          .update({ status: "done", plan: planFromDesign(design), source: "rules" })
          .eq("team_id", team.id);
        if (saveError) await admin.from("blueprints").update({ status: "failed" }).eq("team_id", team.id);
      }
    }),
  );
}
