import type { z } from "zod";
import type { ModelRole } from "@/lib/config/models";

// Names every AI task the app performs. The mock provider uses the task name
// (plus an optional fixtureKey) to pick a fixture from lib/ai/fixtures/.
export type AITask =
  | "generate-cases"
  | "coach-reply"
  | "leak-check"
  | "design-check"
  | "twist"
  | "judge"
  | "reference-solution"
  | "blueprint"
  | "opportunity-map";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type GenerateObjectRequest<T> = {
  task: AITask;
  model: ModelRole;
  system: string;
  messages: ChatTurn[];
  schema: z.ZodType<T>;
  maxTokens?: number;
  // Lets the mock pick a more specific fixture, e.g. the function slug for case generation.
  fixtureKey?: string;
};

export type StreamTextRequest = {
  task: AITask;
  model: ModelRole;
  system: string;
  messages: ChatTurn[];
  maxTokens?: number;
  fixtureKey?: string;
};

export interface AIProvider {
  readonly name: "anthropic" | "openai" | "mock";
  // Returns an object that has already passed schema validation.
  generateObject<T>(req: GenerateObjectRequest<T>): Promise<T>;
  // Yields text chunks as they arrive.
  streamText(req: StreamTextRequest): AsyncIterable<string>;
}

// Thrown when the model's output does not match the schema. Callers must catch
// this and fall back gracefully so a live room never stalls.
export class AIOutputError extends Error {
  constructor(
    message: string,
    readonly task: AITask,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AIOutputError";
  }
}

// Thrown when the model declines the request.
export class AIRefusalError extends Error {
  constructor(readonly task: AITask) {
    super(`The model declined the ${task} request`);
    this.name = "AIRefusalError";
  }
}
