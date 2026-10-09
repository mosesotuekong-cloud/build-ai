// Runs one real blueprint through the active AI provider and compiles it.
// Usage: npx tsx --conditions=react-server scripts/try-blueprint.ts
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

async function main() {
  const { getAIProvider } = await import("@/lib/ai");
  const { writeBlueprint } = await import("@/lib/ai/tasks/blueprint");
  const { compileN8n } = await import("@/lib/export/n8n/compile");
  const provider = getAIProvider();
  const started = Date.now();
  const result = await writeBlueprint(provider, {
    case: { title: "Leave requests by WhatsApp", story: "Staff ask for leave by WhatsApp; HR checks a spreadsheet and the manager by phone.", cost: "6 hours a week", who_feels_it: "HR and line managers", function_name: "HR" },
    design: {
      trigger: "Employee fills in a leave form linked from WhatsApp",
      steps: "Look up their balance in the leave spreadsheet and team leave in Seamless HR",
      decision: "Rule: approve if the balance covers it and fewer than two teammates are off",
      action: "Confirm on WhatsApp and log it in the spreadsheet",
      human: "Line manager approves or declines anything the rule can't settle, by email",
      name: "Leave in a minute",
      hours_saved_per_month: 20,
      tools: ["WhatsApp", "Gmail", "n8n"],
      systems: ["Google Sheets", "Seamless HR"],
    },
    platforms: ["n8n", "power-automate"],
  });
  console.log(`Provider: ${provider.name}, ${((Date.now() - started) / 1000).toFixed(1)}s, source: ${result.source}`);
  if (result.problems.length) console.log("Problems:", result.problems);
  for (const b of result.plan.blocks) console.log(`- [${b.slot}] ${b.kind}: ${b.label}`);
  for (const l of result.plan.links) console.log(`  ${l.from} -> ${l.to}${l.branch ? ` (${l.branch})` : ""}`);
  const wf = compileN8n(result.plan);
  console.log(`Compiled: ${wf.nodes.length} nodes`);
}

main().catch((error) => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : error);
  process.exit(1);
});
