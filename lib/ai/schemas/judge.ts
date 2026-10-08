import { z } from "zod";

// The judging rubric, out of 100. Totals are always computed by the app from
// the per-criterion scores, never taken from the model.
export const RUBRIC = [
  { key: "trigger", label: "Trigger is a real, specific event", max: 15 },
  { key: "steps", label: "Steps gather everything later steps need", max: 20 },
  { key: "decision", label: "Rule versus AI fits the decision", max: 20 },
  { key: "action", label: "Action is concrete and useful", max: 15 },
  { key: "human", label: "Human control is in the right place for the risk", max: 20 },
  { key: "hours", label: "Hours saved is believable and reasoned", max: 10 },
] as const;

export type RubricKey = (typeof RUBRIC)[number]["key"];

export const judgeOutputSchema = z.object({
  criteria: z
    .array(
      z.object({
        key: z.enum(RUBRIC.map((r) => r.key) as [RubricKey, ...RubricKey[]]),
        score: z.number().int().min(0).max(20),
        reasoning: z.string().min(1).max(400),
      }),
    )
    .length(RUBRIC.length),
  summary: z.string().min(1).max(500),
});
export type JudgeOutput = z.infer<typeof judgeOutputSchema>;

export type ScoredCriterion = { key: RubricKey; label: string; max: number; score: number; reasoning: string };

// Clamps each score to its maximum, puts criteria in rubric order and adds up
// the total. Fails if any criterion is missing or repeated.
export function scoreFromJudge(output: JudgeOutput): { breakdown: ScoredCriterion[]; total: number } {
  const breakdown = RUBRIC.map((r) => {
    const matches = output.criteria.filter((c) => c.key === r.key);
    if (matches.length !== 1) throw new Error(`Judge returned ${matches.length} entries for ${r.key}`);
    return { key: r.key, label: r.label, max: r.max, score: Math.min(Math.max(matches[0].score, 0), r.max), reasoning: matches[0].reasoning };
  });
  return { breakdown, total: breakdown.reduce((sum, c) => sum + c.score, 0) };
}

export const referenceSolutionSchema = z.object({
  trigger: z.string().min(3).max(300),
  steps: z.string().min(3).max(400),
  decision: z.string().min(3).max(400),
  action: z.string().min(3).max(400),
  human: z.string().min(3).max(300),
  explanation: z.string().min(20).max(900),
});
export type ReferenceSolution = z.infer<typeof referenceSolutionSchema>;
