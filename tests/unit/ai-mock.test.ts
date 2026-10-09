import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createMockProvider } from "@/lib/ai/mock";
import { AIOutputError } from "@/lib/ai/types";
import { objectFixtures } from "@/lib/ai/fixtures";
import { generatedDeckSchema } from "@/lib/ai/schemas/cases";
import { coachReplySchema, leakCheckSchema } from "@/lib/ai/schemas/coach";
import { judgeOutputSchema, referenceSolutionSchema } from "@/lib/ai/schemas/judge";
import { designCheckSchema, twistSchema } from "@/lib/ai/schemas/check";
import { assessmentSchema } from "@/lib/ai/schemas/assessment";
import { planSchema } from "@/lib/export/plan";
import { reportProseSchema } from "@/lib/ai/schemas/report";
import { generateCases } from "@/lib/ai/tasks/generate-cases";

const provider = createMockProvider({ delayMs: 0 });

// Every object fixture must match the schema its real call uses.
const fixtureSchemas: Record<string, z.ZodType> = {
  "generate-cases": generatedDeckSchema,
  "coach-reply": coachReplySchema,
  "leak-check": leakCheckSchema,
  judge: judgeOutputSchema,
  "reference-solution": referenceSolutionSchema,
  "design-check": designCheckSchema,
  twist: twistSchema,
  assessment: assessmentSchema,
  blueprint: planSchema,
  "opportunity-map": reportProseSchema,
};

describe("AI fixtures", () => {
  for (const [task, entries] of Object.entries(objectFixtures)) {
    for (const [key, value] of Object.entries(entries ?? {})) {
      it(`${task}/${key} matches its schema`, () => {
        const schema = fixtureSchemas[task];
        expect(schema, `add a schema for ${task} to this test`).toBeDefined();
        expect(schema.safeParse(value).success).toBe(true);
      });
    }
  }
});

describe("mock provider", () => {
  it("generates exactly six valid cases", async () => {
    const deck = await generateCases(provider, {
      function_slug: "finance",
      function_name: "Finance",
      industry: "Retail",
      company_size: "50 staff",
    });
    expect(deck.cases).toHaveLength(6);
    expect(new Set(deck.cases.map((c) => c.title)).size).toBe(6);
  });

  it("rejects a fixture that does not match the requested schema", async () => {
    await expect(
      provider.generateObject({
        task: "generate-cases",
        model: "caseGenerator",
        system: "",
        messages: [{ role: "user", content: "hi" }],
        schema: z.object({ something: z.string() }),
      }),
    ).rejects.toBeInstanceOf(AIOutputError);
  });

  it("fails clearly when a task has no fixture", async () => {
    await expect(
      provider.generateObject({
        task: "nonexistent-task" as never,
        model: "opportunityMap",
        system: "",
        messages: [{ role: "user", content: "hi" }],
        schema: z.object({}),
      }),
    ).rejects.toThrow(/No mock fixture/);
  });

  it("streams text in several chunks that join back to the fixture", async () => {
    const chunks: string[] = [];
    for await (const chunk of provider.streamText({
      task: "coach-reply",
      model: "coach",
      system: "",
      messages: [{ role: "user", content: "help" }],
    })) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks.join("")).toMatch(/what actually starts this process/i);
  });
});
