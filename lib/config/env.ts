import { z } from "zod";

// Server-side environment. Import this only from server code (route handlers,
// server components, server actions, scripts). Public values that the browser
// needs are read directly from process.env.NEXT_PUBLIC_* in lib/supabase/browser.ts.

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default("http://127.0.0.1:54321"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  ANTHROPIC_API_KEY: optionalString,
  OPENAI_API_KEY: optionalString,
  N8N_WEBHOOK_BASE_URL: optionalString,
  N8N_WEBHOOK_SECRET: optionalString,
  SUPER_ADMIN_EMAILS: z.string().default("otumosesjobs@gmail.com"),
  AI_MOCK_DELAY_MS: z.coerce.number().int().min(0).default(600),
  // auto: Anthropic, then OpenAI, then mock. Set to mock to save credit while clicking around.
  AI_PROVIDER: z.enum(["auto", "anthropic", "openai", "mock"]).default("auto"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function readServerEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  return serverEnvSchema.parse(source);
}

export type AIProviderName = "anthropic" | "openai" | "mock";
export type MockStatus = { mockAI: boolean; mockN8n: boolean; aiProvider: AIProviderName };

// Which AI provider is live: Anthropic first, then OpenAI, then the mock.
export function activeAIProvider(env: ServerEnv = readServerEnv()): AIProviderName {
  if (env.AI_PROVIDER === "mock") return "mock";
  if (env.AI_PROVIDER === "anthropic" && env.ANTHROPIC_API_KEY) return "anthropic";
  if (env.AI_PROVIDER === "openai" && env.OPENAI_API_KEY) return "openai";
  if (env.ANTHROPIC_API_KEY) return "anthropic";
  if (env.OPENAI_API_KEY) return "openai";
  return "mock";
}

export function getMockStatus(env: ServerEnv = readServerEnv()): MockStatus {
  const aiProvider = activeAIProvider(env);
  return {
    mockAI: aiProvider === "mock",
    mockN8n: !env.N8N_WEBHOOK_BASE_URL,
    aiProvider,
  };
}

export function superAdminEmails(env: ServerEnv = readServerEnv()): string[] {
  return env.SUPER_ADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
