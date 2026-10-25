import { z } from "zod";
import { AI_KINDS } from "@/lib/discovery/scorecard";
import { aiActSchema } from "@/lib/discover/ai-act";
import { generatedCaseSchema } from "./cases";

const aiKinds = AI_KINDS.map((k) => k.value) as [string, ...string[]];
const text = (min: number, max: number) => z.string().trim().min(min).max(max);

// Quick discovery: three challenge ideas for the chosen function.
export const challengeSuggestionsSchema = z.object({
  challenges: z.array(generatedCaseSchema).length(3),
});
export type ChallengeSuggestions = z.infer<typeof challengeSuggestionsSchema>;

// "Start from our week": the team lists recurring tasks; the AI sorts each
// into automate, assist or keep human, then turns the best into challenges.
export const TASK_LABELS = ["automate", "assist", "human"] as const;
export const triagedTaskSchema = z.object({
  task: text(2, 160),
  label: z.enum(TASK_LABELS),
  why: text(5, 200),
});
export const triageSchema = z.object({
  tasks: z.array(triagedTaskSchema).min(1).max(12),
  challenges: z.array(generatedCaseSchema).min(1).max(3),
});
export type Triage = z.infer<typeof triageSchema>;
export type TriagedTask = z.infer<typeof triagedTaskSchema>;

// One coaching question for the card the team is on. Never an answer.
export const cardNudgeSchema = z.object({
  question: text(10, 300),
});
export type CardNudge = z.infer<typeof cardNudgeSchema>;

// After the game: the questions a good discovery consultant would ask next.
export const FOLLOW_UP_TOPICS = ["volume", "data", "access", "privacy", "risk", "people", "success", "cost"] as const;
export const followUpQuestionSchema = z.object({
  id: z.string().regex(/^q[1-9]$/),
  topic: z.enum(FOLLOW_UP_TOPICS),
  question: text(10, 200),
  // Why it matters, in one short line, so people answer it properly.
  why: text(10, 200),
  // Up to five quick answers to tap; null means a typed answer only.
  options: z.array(text(1, 60)).min(2).max(5).nullable(),
});
export const followUpSchema = z.object({
  questions: z.array(followUpQuestionSchema).min(5).max(7),
});
export type FollowUpQuestion = z.infer<typeof followUpQuestionSchema>;
export type FollowUp = z.infer<typeof followUpSchema>;

// The answers people gave, by question id.
export const followUpAnswersSchema = z.record(z.string().regex(/^q[1-9]$/), z.string().trim().max(500));
export type FollowUpAnswers = z.infer<typeof followUpAnswersSchema>;

// Readiness, scored 1–5 on five dimensions where 5 is always "ready to go"
// (for risk, 5 means low risk). The overall score is worked out in code.
export const READINESS_DIMENSIONS = [
  { key: "value", label: "Value" },
  { key: "data", label: "Data" },
  { key: "access", label: "System access" },
  { key: "risk", label: "Risk under control" },
  { key: "people", label: "People and ownership" },
] as const;
export const readinessDimensionSchema = z.object({
  key: z.enum(["value", "data", "access", "risk", "people"]),
  score: z.number().int().min(1).max(5),
  note: text(5, 220),
});

// The strengthened design: the AI's improved version of the team's workflow,
// grounded in their answers.
export const strengthenSchema = z.object({
  summary: text(20, 500),
  readiness: z.array(readinessDimensionSchema).length(5),
  ai_kind: z.enum(aiKinds),
  design: z.object({
    name: text(3, 80),
    trigger: text(3, 400),
    steps: text(3, 500),
    decision: text(3, 500),
    action: text(3, 500),
    human: text(3, 400),
    oversight: z.enum(["in", "on", "out"]),
  }),
  changes: z.array(text(5, 240)).min(1).max(6),
  risks: z.array(z.object({ risk: text(5, 200), mitigation: text(5, 240) })).min(1).max(5),
  next_steps: z.array(z.object({ step: text(5, 200), who: text(2, 80), when: text(2, 40) })).min(3).max(5),
  open_questions: z.array(text(5, 200)).max(4),
  hours_saved_per_month: z.number().min(0).max(5000).nullable(),
  // Starting values for the business case, from the team's answers.
  estimates: z.object({
    cases_per_month: z.number().min(0).max(1_000_000),
    minutes_per_case: z.number().min(0).max(10_000),
    automatable_share: z.number().min(0).max(1),
    build_days: z.number().min(0).max(1000),
    running_cost_per_month: z.number().min(0).max(10_000_000),
  }),
  // EU AI Act: the AI's first read of where this sits.
  ai_act: aiActSchema,
});
export type Strengthened = z.infer<typeof strengthenSchema>;
// Strengthened results saved before the estimates and the AI Act check
// existed still load.
export const storedStrengthenSchema = strengthenSchema.partial({ estimates: true, ai_act: true });
export type StoredStrengthened = z.infer<typeof storedStrengthenSchema>;

// Overall readiness out of 100: the average of the five dimensions.
export function readinessScore(dims: Strengthened["readiness"]): number {
  if (!dims.length) return 0;
  const avg = dims.reduce((n, d) => n + d.score, 0) / dims.length;
  return Math.round(((avg - 1) / 4) * 100);
}
