import "server-only";
import { getAIProvider } from "@/lib/ai";
import { writeTwist } from "@/lib/ai/tasks/check-and-twist";
import { functionName } from "@/lib/decks/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

// Writes a twist for every team in the session that doesn't have one yet,
// in parallel. Each team's twist fits its own case and design; any team the
// AI can't serve in time gets one from the curated bank.
export async function generateTwistsForSession(admin: Admin, sessionId: string, platforms: string[]) {
  const { data: teams } = await admin
    .from("teams")
    .select("id, case_id, cases (title, story, cost, who_feels_it, function_slug), designs (version, trigger, steps, decision, action, human, name, hours_saved_per_month, tools, systems), twists (id)")
    .eq("session_id", sessionId);
  if (!teams?.length) return;

  const provider = getAIProvider();
  await Promise.all(
    teams
      .filter((t) => !t.twists && t.cases)
      .map(async (team) => {
        const design = team.designs.find((d) => d.version === "before_twist") ?? team.designs[0];
        const c = team.cases!;
        const twist = await writeTwist(provider, team.id, {
          case: { title: c.title, story: c.story, cost: c.cost, who_feels_it: c.who_feels_it, function_name: functionName(c.function_slug) },
          design: {
            trigger: design?.trigger ?? "",
            steps: design?.steps ?? "",
            decision: design?.decision ?? "",
            action: design?.action ?? "",
            human: design?.human ?? "",
            name: design?.name ?? "",
            hours_saved_per_month: design?.hours_saved_per_month === null || design?.hours_saved_per_month === undefined ? null : Number(design.hours_saved_per_month),
            tools: design?.tools ?? [],
            systems: design?.systems ?? [],
          },
          phase: "twist",
          platforms,
        });
        await admin
          .from("twists")
          .upsert(
            { team_id: team.id, session_id: sessionId, kind: "operational", content: twist.twist, affects: twist.affects, source: twist.source },
            { onConflict: "team_id", ignoreDuplicates: true },
          );
      }),
  );
}
