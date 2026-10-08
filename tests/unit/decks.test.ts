import { describe, expect, it } from "vitest";
import { moveItem, nextPosition } from "@/lib/decks/ordering";
import { caseFormSchema, fieldErrors, functionName, newDeckSchema, parseTools } from "@/lib/decks/schemas";

describe("moveItem", () => {
  const items = [
    { id: "a", position: 0 },
    { id: "b", position: 1 },
    { id: "c", position: 2 },
  ];

  it("swaps an item with its neighbour", () => {
    expect(moveItem(items, "b", "up")).toEqual([
      { id: "b", position: 0 },
      { id: "a", position: 1 },
    ]);
    expect(moveItem(items, "b", "down")).toEqual([
      { id: "c", position: 1 },
      { id: "b", position: 2 },
    ]);
  });

  it("does nothing at the ends or for unknown ids", () => {
    expect(moveItem(items, "a", "up")).toEqual([]);
    expect(moveItem(items, "c", "down")).toEqual([]);
    expect(moveItem(items, "zzz", "up")).toEqual([]);
  });

  it("closes gaps left by deleted cases", () => {
    const gappy = [
      { id: "a", position: 0 },
      { id: "b", position: 4 },
      { id: "c", position: 9 },
    ];
    expect(moveItem(gappy, "c", "up")).toEqual([
      { id: "c", position: 1 },
      { id: "b", position: 2 },
    ]);
  });

  it("appends after the highest position", () => {
    expect(nextPosition([])).toBe(0);
    expect(nextPosition([{ id: "a", position: 0 }, { id: "b", position: 7 }])).toBe(8);
  });
});

describe("deck forms", () => {
  it("parses a tools list, trimming and removing duplicates", () => {
    expect(parseTools(" Excel, WhatsApp\nexcel ,, Sage ")).toEqual(["Excel", "WhatsApp", "Sage"]);
  });

  it("accepts a valid new deck and defaults the country to Nigeria", () => {
    const result = newDeckSchema.safeParse({
      name: "Leadership offsite",
      industry: "Retail banking",
      company_size: "101–500 staff",
      tools: ["Excel"],
      function_slugs: ["hr", "finance"],
      mode: "generate",
    });
    expect(result.success).toBe(true);
    expect(result.data?.country).toBe("Nigeria");
  });

  it("explains what is wrong in plain words", () => {
    const result = newDeckSchema.safeParse({ name: "x", industry: "", company_size: "", tools: [], function_slugs: [], mode: "generate" });
    expect(result.success).toBe(false);
    const errors = fieldErrors(result.error!);
    expect(errors.name).toMatch(/at least 2 characters/);
    expect(errors.function_slugs).toMatch(/at least one function/);
  });

  it("rejects unknown functions", () => {
    const result = newDeckSchema.safeParse({ name: "Deck", industry: "Retail", company_size: "1–20 staff", tools: [], function_slugs: ["marketing"], mode: "empty" });
    expect(result.success).toBe(false);
  });

  it("validates hand-written cases with the database limits", () => {
    expect(caseFormSchema.safeParse({ title: "The receipt shoebox", story: "Staff send receipts on WhatsApp and nobody can find them." }).success).toBe(true);
    expect(caseFormSchema.safeParse({ title: "Hi", story: "Too short" }).success).toBe(false);
  });

  it("names functions for display", () => {
    expect(functionName("customer-service")).toBe("Customer Service");
    expect(functionName("hr")).toBe("HR");
  });
});
