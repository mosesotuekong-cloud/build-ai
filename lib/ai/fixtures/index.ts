import type { AITask } from "../types";
import type { CoachReply } from "../schemas/coach";
import { caseFixtures } from "./cases";

// Fixtures for the mock provider. Each task maps fixture keys to a value;
// "default" is used when the request has no fixtureKey or no exact match.
// Every object fixture must pass the same zod schema the real call uses
// (tests/unit/ai-fixtures.test.ts checks this).

const coachReply: CoachReply = {
  type: "question",
  slot: "trigger",
  text: "Before we get to the clever bits, what actually starts this process today? Is it a message arriving, a form, a date on the calendar, or something else?",
};

export const objectFixtures: Partial<Record<AITask, Record<string, unknown>>> = {
  "generate-cases": { default: caseFixtures.finance, ...caseFixtures },
  "coach-reply": { default: coachReply },
};

export const textFixtures: Partial<Record<AITask, Record<string, string>>> = {
  "coach-reply": { default: coachReply.text },
};

export function findFixture<T>(table: Partial<Record<AITask, Record<string, T>>>, task: AITask, key?: string): T | undefined {
  const entries = table[task];
  if (!entries) return undefined;
  return (key && entries[key]) || entries.default;
}
