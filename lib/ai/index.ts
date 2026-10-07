import "server-only";
import { activeAIProvider, readServerEnv } from "@/lib/config/env";
import { createAnthropicProvider } from "./anthropic";
import { createMockProvider } from "./mock";
import { createOpenAIProvider } from "./openai";
import type { AIProvider } from "./types";

export * from "./types";

let cached: AIProvider | undefined;

// The single entry point for every AI call in the app. Which provider is used
// is decided by activeAIProvider(): Anthropic, then OpenAI, then the mock,
// unless AI_PROVIDER says otherwise.
export function getAIProvider(): AIProvider {
  if (cached) return cached;
  const env = readServerEnv();
  const which = activeAIProvider(env);
  if (which === "anthropic") cached = createAnthropicProvider(env.ANTHROPIC_API_KEY!);
  else if (which === "openai") cached = createOpenAIProvider(env.OPENAI_API_KEY!);
  else cached = createMockProvider({ delayMs: env.AI_MOCK_DELAY_MS });
  return cached;
}
