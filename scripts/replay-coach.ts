// Replays a scripted conversation against the live coach for one team's case
// and design, without saving anything. Used to tune lib/ai/prompts/coach.ts.
// Usage: npx tsx --conditions=react-server scripts/replay-coach.ts <team-id>
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

const SCRIPT: { request: "question" | "nudge" | "analogy"; message: string; systems?: string[] }[] = [
  { request: "question", message: "what do you think the trigger shouldl be" },
  { request: "question", message: "I am an admin on slack, no personal data", systems: ["Slack"] },
  { request: "nudge", message: "We'd like a nudge." },
  { request: "question", message: "Help us think about our decision slot." },
  { request: "question", message: "Help us think about our human in control slot." },
  { request: "analogy", message: "We'd like an analogy." },
  { request: "question", message: "what does systems invloved mean" },
  { request: "question", message: "microsost co-pilot", systems: ["Slack", "Microsoft Copilot"] },
];

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const { getAIProvider } = await import("@/lib/ai");
  const { runCoachTurn } = await import("@/lib/coach/engine");
  const { functionName } = await import("@/lib/decks/schemas");
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  const teamId = process.argv[2];
  const { data: team } = await admin.from("teams").select("case_id, sessions (target_platforms)").eq("id", teamId).single();
  const { data: c } = await admin.from("cases").select("*").eq("id", team!.case_id!).single();
  const { data: d } = await admin.from("designs").select("*").eq("team_id", teamId).single();
  const design = { ...d!, hours_saved_per_month: d!.hours_saved_per_month === null ? null : Number(d!.hours_saved_per_month) };
  const ctxCase = { title: c!.title, story: c!.story, cost: c!.cost, who_feels_it: c!.who_feels_it, function_name: functionName(c!.function_slug) };
  const history: { role: "team" | "coach"; content: string }[] = [];
  const provider = getAIProvider();
  console.log(`Provider: ${provider.name}. Case: ${ctxCase.title}\n`);

  for (const turn of SCRIPT) {
    if (turn.systems) design.systems = turn.systems;
    const result = await runCoachTurn(provider, { case: ctxCase, design, phase: "solving", platforms: [], history }, turn.request, turn.message);
    history.push({ role: "team", content: turn.message }, { role: "coach", content: result.reply.text });
    console.log(`TEAM (${turn.request}): ${turn.message}`);
    console.log(`COACH [${result.reply.type} · ${result.reply.slot}${result.source === "fallback" ? " · FALLBACK" : ""}${result.leakBlocked ? ` · leak-blocked ${result.leakBlocked}` : ""}]: ${result.reply.text}\n`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
