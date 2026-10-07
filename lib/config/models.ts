// Every model name used by the app, per provider. Change models here, nowhere else.
// The app uses Anthropic if ANTHROPIC_API_KEY is set, otherwise OpenAI if
// OPENAI_API_KEY is set, otherwise the mock (see lib/ai/index.ts).
// Agreed 2026-10-06 and 2026-10-07 (see BRIEF.md decisions log).

export const MODEL_ROLES = [
  "coach",
  "leakCheck",
  "designCheck",
  "twist",
  "judge",
  "caseGenerator",
  "referenceSolution",
  "blueprint",
  "opportunityMap",
] as const;

export type ModelRole = (typeof MODEL_ROLES)[number];

export const MODELS = {
  anthropic: {
    coach: "claude-sonnet-5-5",
    leakCheck: "claude-haiku-4-5",
    designCheck: "claude-sonnet-5-5",
    twist: "claude-sonnet-5-5",
    judge: "claude-sonnet-5-5",
    caseGenerator: "claude-opus-5-5",
    referenceSolution: "claude-opus-5-5",
    blueprint: "claude-opus-5-5",
    opportunityMap: "claude-opus-5-5",
  },
  openai: {
    coach: "gpt-5.4-mini",
    leakCheck: "gpt-5.4-nano",
    designCheck: "gpt-5.4-mini",
    twist: "gpt-5.4-mini",
    judge: "gpt-5.5",
    caseGenerator: "gpt-5.5",
    referenceSolution: "gpt-5.5",
    blueprint: "gpt-5.5",
    opportunityMap: "gpt-5.5",
  },
} as const satisfies Record<string, Record<ModelRole, string>>;

// How hard each model thinks. Lower effort means faster, cheaper replies.
// Used as Anthropic's effort and OpenAI's reasoning effort. Ignored for
// Claude Haiku, which does not support it.
export const MODEL_EFFORT: Record<ModelRole, "low" | "medium" | "high"> = {
  coach: "low",
  leakCheck: "low",
  designCheck: "medium",
  twist: "low",
  judge: "low",
  caseGenerator: "high",
  referenceSolution: "high",
  blueprint: "medium",
  opportunityMap: "high",
};
