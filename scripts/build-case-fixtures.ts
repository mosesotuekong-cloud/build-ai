// Generates one sample deck per function with the live AI provider and saves
// them as mock fixtures in lib/ai/fixtures/cases.generated.json. Run rarely;
// review the output before committing.
// Usage: npx tsx --conditions=react-server scripts/build-case-fixtures.ts hr sales ...
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

const CONTEXT: Record<string, { industry: string; size: string; tools: string[] }> = {
  hr: { industry: "Commercial bank", size: "800 staff", tools: ["Outlook", "Excel", "WhatsApp", "SeamlessHR"] },
  finance: { industry: "FMCG distribution", size: "120 staff", tools: ["Excel", "WhatsApp", "Sage", "Gmail"] },
  sales: { industry: "Building materials manufacturer", size: "300 staff", tools: ["WhatsApp", "Excel", "Zoho CRM", "Gmail"] },
  procurement: { industry: "Oil and gas services", size: "450 staff", tools: ["Outlook", "Excel", "SAP", "Paper requisition forms"] },
  operations: { industry: "Logistics and haulage", size: "250 staff", tools: ["WhatsApp", "Google Sheets", "Paper waybills", "GPS tracker portal"] },
  "customer-service": { industry: "Fintech and payments", size: "180 staff", tools: ["Freshdesk", "WhatsApp Business", "Gmail", "Excel"] },
  it: { industry: "Insurance company", size: "600 staff", tools: ["Microsoft 365", "Excel", "Jira", "WhatsApp"] },
};

async function main() {
  const { getAIProvider } = await import("@/lib/ai");
  const { generateCases } = await import("@/lib/ai/tasks/generate-cases");
  const { functionName } = await import("@/lib/decks/schemas");
  const slugs = process.argv.slice(2);
  const file = "lib/ai/fixtures/cases.generated.json";
  const out: Record<string, unknown> = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const provider = getAIProvider();
  if (provider.name === "mock") throw new Error("Set a real AI key first; the mock cannot build fixtures.");

  await Promise.all(
    slugs.map(async (slug) => {
      const ctx = CONTEXT[slug];
      const deck = await generateCases(provider, {
        function_slug: slug,
        function_name: functionName(slug),
        industry: ctx.industry,
        company_size: ctx.size,
        tools: ctx.tools,
      });
      out[slug] = deck;
      console.log(`${slug}: ${deck.cases.map((c) => c.title).join(" | ")}`);
    }),
  );
  writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
}

main().catch((error) => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : error);
  process.exit(1);
});
