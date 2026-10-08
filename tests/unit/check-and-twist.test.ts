import { describe, expect, it } from "vitest";
import { CHECK_QUESTIONS } from "@/lib/ai/schemas/check";
import { runDesignCheck, writeTwist } from "@/lib/ai/tasks/check-and-twist";
import type { AIProvider, GenerateObjectRequest } from "@/lib/ai/types";
import type { CoachContext } from "@/lib/coach/context";
import { bankTwistFor, TWIST_BANK } from "@/lib/twists/bank";

const situation: Omit<CoachContext, "history"> = {
  case: { title: "The WhatsApp leave jungle", story: "Leave requests arrive by WhatsApp.", cost: "", who_feels_it: "HR", function_name: "HR" },
  design: { trigger: "Improve leave", steps: "", decision: "AI decides", action: "", human: "", name: "", hours_saved_per_month: 900, tools: [], systems: [] },
  phase: "solving",
  platforms: [],
};

function scripted(responses: Record<string, unknown[]>): AIProvider {
  const queues = Object.fromEntries(Object.entries(responses).map(([k, v]) => [k, [...v]]));
  return {
    name: "mock",
    async generateObject<T>(req: GenerateObjectRequest<T>) {
      const next = queues[req.task]?.shift();
      if (next instanceof Error) throw next;
      if (next === "hang") return new Promise<T>(() => {});
      return req.schema.parse(next);
    },
    async *streamText() {},
  };
}

const flags = {
  flags: [
    { slot: "trigger", kind: "vague_trigger", question: "Is 'improve leave' something that happens at a moment in time?" },
    { slot: "trigger", kind: "vague_trigger", question: "Duplicate of the first flag." },
    { slot: "hours_saved", kind: "hours_unbelievable", question: "How did you get to 900 hours a month?" },
  ],
};

describe("design check", () => {
  it("keeps clean questions and drops duplicate flags", async () => {
    const provider = scripted({ "design-check": [flags], "leak-check": [{ reads_like_answer: false, reason: "questions" }] });
    const result = await runDesignCheck(provider, situation);
    expect(result.reworded).toBe(false);
    expect(result.flags.map((f) => f.kind)).toEqual(["vague_trigger", "hours_unbelievable"]);
  });

  it("swaps in safe template questions when the wording gives the answer away", async () => {
    const provider = scripted({ "design-check": [flags], "leak-check": [{ reads_like_answer: true, reason: "names the trigger" }] });
    const result = await runDesignCheck(provider, situation);
    expect(result.reworded).toBe(true);
    expect(result.flags[0].question).toBe(CHECK_QUESTIONS.vague_trigger);
  });

  it("plays safe if the leak check itself fails", async () => {
    const provider = scripted({ "design-check": [flags], "leak-check": [new Error("down")] });
    const result = await runDesignCheck(provider, situation);
    expect(result.reworded).toBe(true);
  });

  it("returns no flags for a design without hard errors, without a leak check", async () => {
    const provider = scripted({ "design-check": [{ flags: [] }] });
    expect(await runDesignCheck(provider, situation)).toEqual({ flags: [], reworded: false });
  });

  it("lets an AI failure surface, so the coin can be refunded", async () => {
    const provider = scripted({ "design-check": [new Error("timeout")] });
    await expect(runDesignCheck(provider, situation)).rejects.toThrow();
  });
});

describe("twists", () => {
  it("uses the AI's twist when it arrives in time", async () => {
    const provider = scripted({ twist: [{ twist: "Finance freezes all new spending this quarter.", affects: ["steps"] }] });
    expect(await writeTwist(provider, "team-1", situation)).toMatchObject({ source: "ai", twist: "Finance freezes all new spending this quarter." });
  });

  it("falls back to the bank when the AI is slow or fails", async () => {
    expect(await writeTwist(scripted({ twist: ["hang"] }), "team-1", situation, 50)).toMatchObject({ source: "bank" });
    expect(await writeTwist(scripted({ twist: [new Error("down")] }), "team-1", situation)).toMatchObject({ source: "bank" });
  });

  it("gives each team a stable twist from the bank", () => {
    expect(bankTwistFor("team-1")).toEqual(bankTwistFor("team-1"));
    expect(TWIST_BANK).toContainEqual(bankTwistFor("another-team"));
  });
});
