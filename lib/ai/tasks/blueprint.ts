import { BLUEPRINT_SYSTEM } from "../prompts/blueprint";
import type { AIProvider } from "../types";
import { describeSituation, type CoachCase, type CoachDesign } from "@/lib/coach/context";
import { planFromDesign } from "@/lib/export/from-design";
import { planSchema, validatePlan, type Plan } from "@/lib/export/plan";

export type BlueprintResult = { plan: Plan; source: "ai" | "rules"; problems: string[] };

// Turns a final design into a tool-neutral plan. The AI's plan must pass the
// schema and the semantic checks; one retry with the problems listed, then
// the rule-based plan, so a download is always ready.
export async function writeBlueprint(
  provider: AIProvider,
  input: { case: CoachCase; design: CoachDesign; twist?: string | null; platforms: string[] },
): Promise<BlueprintResult> {
  const situation = describeSituation({ case: input.case, design: input.design, phase: "reveal", twist: input.twist ?? null, platforms: input.platforms });
  let problems: string[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const plan = await provider.generateObject({
        task: "blueprint",
        model: "blueprint",
        system: BLUEPRINT_SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              situation,
              "",
              problems.length ? `Your last plan had these problems. Fix them:\n- ${problems.join("\n- ")}\n` : "",
              "Write the plan for this design.",
            ].join("\n"),
          },
        ],
        schema: planSchema,
        maxTokens: 6000,
      });
      problems = validatePlan(plan, { requireApproval: input.design.oversight !== "out" });
      if (!problems.length) return { plan, source: "ai", problems: [] };
    } catch (error) {
      problems = [error instanceof Error ? error.message : "The plan could not be read."];
    }
  }
  return { plan: planFromDesign(input.design), source: "rules", problems };
}
