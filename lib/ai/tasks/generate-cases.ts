import { CASE_GENERATOR_SYSTEM, caseGeneratorUserMessage } from "../prompts/case-generator";
import { caseGeneratorInputSchema, generatedDeckSchema, type CaseGeneratorInput, type GeneratedDeck } from "../schemas/cases";
import type { AIProvider } from "../types";

// Generates six case cards for one function. Called by n8n in production
// (via the same prompt) and directly by the local n8n fallback in development.
export async function generateCases(provider: AIProvider, rawInput: CaseGeneratorInput): Promise<GeneratedDeck> {
  const input = caseGeneratorInputSchema.parse(rawInput);
  return provider.generateObject({
    task: "generate-cases",
    model: "caseGenerator",
    system: CASE_GENERATOR_SYSTEM,
    messages: [{ role: "user", content: caseGeneratorUserMessage(input) }],
    schema: generatedDeckSchema,
    fixtureKey: input.function_slug,
  });
}
