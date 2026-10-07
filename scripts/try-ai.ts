// Runs one real case generation through the active AI provider.
// Usage: npx tsx --conditions=react-server scripts/try-ai.ts [function-slug]
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

async function main() {
  const { getAIProvider } = await import("@/lib/ai");
  const { generateCases } = await import("@/lib/ai/tasks/generate-cases");
  const slug = process.argv[2] ?? "finance";
  const provider = getAIProvider();
  const started = Date.now();
  const deck = await generateCases(provider, {
    function_slug: slug,
    function_name: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    industry: "Fast-moving consumer goods distribution",
    company_size: "120 staff",
    tools: ["Excel", "WhatsApp", "Sage", "Gmail"],
  });
  console.log(`Provider: ${provider.name}, ${((Date.now() - started) / 1000).toFixed(1)}s, ${deck.cases.length} cases\n`);
  for (const c of deck.cases) console.log(`- ${c.title}\n  ${c.story}\n  Cost: ${c.cost}\n  Who: ${c.who_feels_it}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : error);
  process.exit(1);
});
