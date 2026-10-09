// Builds the sample opportunity map and writes its prose with the active AI
// provider. Usage: npm run ai:report
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

const { getAIProvider } = await import("@/lib/ai");
const { buildOpportunityMap } = await import("@/lib/report/map");
const { writeReportProse } = await import("@/lib/report/prose");
const { sampleReportInput } = await import("@/lib/report/fixtures");

const map = buildOpportunityMap(sampleReportInput);
const provider = getAIProvider();
const started = Date.now();
const { prose, source } = await writeReportProse(provider, map);
console.log(`Provider: ${provider.name}, ${((Date.now() - started) / 1000).toFixed(1)}s, prose: ${source}\n`);
console.log(JSON.stringify(prose, null, 2));
