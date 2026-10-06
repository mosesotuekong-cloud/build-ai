import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generatedDeckSchema } from "@/lib/ai/schemas/cases";
import { HR_DEFAULT_CASES } from "@/lib/decks/hr-default";

describe("default HR deck", () => {
  it("is six cards that pass the same schema as AI-generated decks", () => {
    expect(generatedDeckSchema.safeParse({ cases: HR_DEFAULT_CASES }).success).toBe(true);
  });

  it("matches the cards in seed/hr-cards.md", () => {
    const markdown = readFileSync("seed/hr-cards.md", "utf8");
    const titles = [...markdown.matchAll(/^## \d\. (.+)$/gm)].map((m) => m[1].trim());
    expect(titles).toEqual(HR_DEFAULT_CASES.map((c) => c.title));
    for (const c of HR_DEFAULT_CASES) expect(markdown).toContain(c.story);
  });
});
