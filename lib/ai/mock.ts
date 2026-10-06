import { findFixture, objectFixtures, textFixtures } from "./fixtures";
import { AIOutputError, type AIProvider, type GenerateObjectRequest, type StreamTextRequest } from "./types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A stand-in for the real model when ANTHROPIC_API_KEY is missing. Returns
// fixtures after a short delay and validates them with the same schemas, so
// the rest of the app cannot tell the difference.
export function createMockProvider({ delayMs = 600 }: { delayMs?: number } = {}): AIProvider {
  return {
    name: "mock",

    async generateObject<T>(req: GenerateObjectRequest<T>): Promise<T> {
      await sleep(delayMs);
      const fixture = findFixture(objectFixtures, req.task, req.fixtureKey);
      if (fixture === undefined) {
        throw new AIOutputError(`No mock fixture for task "${req.task}"`, req.task);
      }
      const result = req.schema.safeParse(structuredClone(fixture));
      if (!result.success) {
        throw new AIOutputError(`Mock fixture for "${req.task}" does not match its schema`, req.task, result.error);
      }
      return result.data;
    },

    async *streamText(req: StreamTextRequest): AsyncIterable<string> {
      const text = findFixture(textFixtures, req.task, req.fixtureKey);
      if (text === undefined) {
        throw new AIOutputError(`No mock text fixture for task "${req.task}"`, req.task);
      }
      await sleep(Math.min(delayMs, 400));
      // Stream word by word so the UI behaves as it will with the real model.
      const pieces = text.match(/\S+\s*/g) ?? [text];
      const perPiece = delayMs === 0 ? 0 : 25;
      for (const piece of pieces) {
        if (perPiece) await sleep(perPiece);
        yield piece;
      }
    },
  };
}
