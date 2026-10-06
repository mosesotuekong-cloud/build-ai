import "server-only";
import { getAIProvider } from "@/lib/ai";
import { readServerEnv } from "@/lib/config/env";
import { createN8nClient, type N8nClient } from "./client";

export * from "./client";
export type { N8nJobName, N8nJobInput, N8nJobOutput } from "./jobs";

let cached: N8nClient | undefined;

export function getN8nClient(): N8nClient {
  if (cached) return cached;
  const env = readServerEnv();
  cached = createN8nClient({
    baseUrl: env.N8N_WEBHOOK_BASE_URL,
    secret: env.N8N_WEBHOOK_SECRET,
    provider: getAIProvider(),
  });
  return cached;
}
