import "server-only";
import { readServerEnv } from "@/lib/config/env";
import { createAnthropicProvider } from "./anthropic";
import { createMockProvider } from "./mock";
import type { AIProvider } from "./types";

export * from "./types";

let cached: AIProvider | undefined;

// The single entry point for every AI call in the app.
// No ANTHROPIC_API_KEY means the mock provider.
export function getAIProvider(): AIProvider {
  if (cached) return cached;
  const env = readServerEnv();
  cached = env.ANTHROPIC_API_KEY
    ? createAnthropicProvider(env.ANTHROPIC_API_KEY)
    : createMockProvider({ delayMs: env.AI_MOCK_DELAY_MS });
  return cached;
}
