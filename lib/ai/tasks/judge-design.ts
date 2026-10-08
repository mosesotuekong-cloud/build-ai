import { JUDGE_SYSTEM } from "../prompts/judge";
import { REFERENCE_SOLUTION_SYSTEM } from "../prompts/reference-solution";
import { judgeOutputSchema, referenceSolutionSchema, scoreFromJudge, type ReferenceSolution } from "../schemas/judge";
import type { AIProvider } from "../types";
import { describeSituation, type CoachCase, type CoachDesign } from "@/lib/coach/context";

// Scores one design against the rubric. The total is computed here, not by the model.
export async function judgeDesign(provider: AIProvider, input: { case: CoachCase; design: CoachDesign; twist?: string | null }) {
  const situation = describeSituation({ case: input.case, design: input.design, phase: "judging", twist: input.twist, platforms: [] });
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
