// Every model name used by the app. Change models here, nowhere else.
// Agreed 2026-10-06 (see BRIEF.md decisions log).
export const MODELS = {
  coach: "claude-sonnet-5-5",
  leakCheck: "claude-haiku-4-5",
  designCheck: "claude-sonnet-5-5",
  twist: "claude-sonnet-5-5",
  judge: "claude-sonnet-5-5",
  caseGenerator: "claude-opus-5-5",
  referenceSolution: "claude-opus-5-5",
  blueprint: "claude-opus-5-5",
  opportunityMap: "claude-opus-5-5",
} as const;

export type ModelRole = keyof typeof MODELS;

// How hard each model thinks. Lower effort means faster, cheaper replies.
// Ignored for Haiku, which does not support it.
export const MODEL_EFFORT: Record<ModelRole, "low" | "medium" | "high"> = {
  coach: "low",
  leakCheck: "low",
  designCheck: "medium",
  twist: "low",
  judge: "medium",
  caseGenerator: "high",
  referenceSolution: "high",
  blueprint: "medium",
  opportunityMap: "high",
};
