import { JUDGE_SYSTEM } from "../prompts/judge";
import { REFERENCE_SOLUTION_SYSTEM } from "../prompts/reference-solution";
import { judgeOutputSchema, referenceSolutionSchema, scoreFromJudge, type ReferenceSolution } from "../schemas/judge";
import type { AIProvider } from "../types";
import { describeSituation, type CoachCase, type CoachDesign } from "@/lib/coach/context";
import { ASSESSMENT_SYSTEM } from "../prompts/assessment";
import { assessmentSchema, type Assessment } from "../schemas/assessment";
import type { ScoredCriterion } from "../schemas/judge";
import { getPlatform } from "@/lib/config/platforms";

// Scores one design against the rubric. The total is computed here, not by the model.
export async function judgeDesign(provider: AIProvider, input: { case: CoachCase; design: CoachDesign; twist?: string | null }) {
  const situation = describeSituation({ case: input.case, design: input.design, phase: "judging", twist: input.twist ?? null, platforms: [] });
  const output = await provider.generateObject({
    task: "judge",
    model: "judge",
    system: JUDGE_SYSTEM,
    messages: [{ role: "user", content: `${situation}\n\nScore this design.` }],
    schema: judgeOutputSchema,
    maxTokens: 4000,
  });
  return { ...scoreFromJudge(output), summary: output.summary };
}

// Writes the model answer for a case. Never shown before the reveal.
export async function writeReferenceSolution(
  provider: AIProvider,
  input: { case: CoachCase; companyTools: string[] },
): Promise<ReferenceSolution> {
  const c = input.case;
  return provider.generateObject({
    task: "reference-solution",
    model: "referenceSolution",
    system: REFERENCE_SOLUTION_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          `CASE (${c.function_name}): ${c.title}`,
          c.story,
          c.cost && `What it costs: ${c.cost}`,
          c.who_feels_it && `Who feels it: ${c.who_feels_it}`,
          input.companyTools.length ? `Tools the company uses: ${input.companyTools.join(", ")}` : "",
          "",
          "Write the model answer.",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    schema: referenceSolutionSchema,
    maxTokens: 4000,
  });
}

// The AI's discovery assessment of the use case, for the business. Unknown
// platform slugs are dropped.
export async function assessUseCase(
  provider: AIProvider,
  input: { case: CoachCase; design: CoachDesign; twist?: string | null; platforms: string[] },
): Promise<Assessment> {
  const situation = describeSituation({ case: input.case, design: input.design, phase: "judging", twist: input.twist ?? null, platforms: input.platforms });
  const stack = input.platforms.map((s) => `${s} (${getPlatform(s)?.name ?? s})`).join(", ");
  const result = await provider.generateObject({
    task: "assessment",
    model: "judge",
    system: ASSESSMENT_SYSTEM,
    messages: [{ role: "user", content: `${situation}

Platform slugs in the company's stack: ${stack || "none listed"}.

Assess this use case.` }],
    schema: assessmentSchema,
    maxTokens: 2000,
  });
  return { ...result, platform_fit: result.platform_fit && input.platforms.includes(result.platform_fit) ? result.platform_fit : null };
}

// Solo checks have no hours estimate, so they are scored out of the other
// five criteria (90 points) and scaled to 100, keeping before and after fair.
export function checkScoreFrom(breakdown: ScoredCriterion[]): number {
  const scored = breakdown.filter((c) => c.key !== "hours");
  const max = scored.reduce((sum, c) => sum + c.max, 0);
  const got = scored.reduce((sum, c) => sum + c.score, 0);
  return max ? Math.round((got / max) * 100) : 0;
}
