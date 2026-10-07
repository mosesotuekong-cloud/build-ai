import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { MODELS, MODEL_EFFORT } from "@/lib/config/models";
import { AIOutputError, AIRefusalError, type AIProvider, type GenerateObjectRequest, type StreamTextRequest } from "./types";

// OpenAI provider, using the Responses API with structured outputs.
// Same contract as the Anthropic provider: every object is checked against
// our own zod schema before it is returned.
export function createOpenAIProvider(apiKey: string): AIProvider {
  const client = new OpenAI({ apiKey, maxRetries: 2, timeout: 120_000 });

  return {
    name: "openai",

    async generateObject<T>(req: GenerateObjectRequest<T>): Promise<T> {
      const response = await client.responses.parse({
        model: MODELS.openai[req.model],
        reasoning: { effort: MODEL_EFFORT[req.model] },
        instructions: req.system,
        input: req.messages,
        max_output_tokens: req.maxTokens ?? 16000,
        text: { format: zodTextFormat(req.schema, req.task.replace(/[^a-zA-Z0-9_-]/g, "_")) },
      });

      const refused = response.output.some(
        (item) => item.type === "message" && item.content.some((part) => part.type === "refusal"),
      );
      if (refused) throw new AIRefusalError(req.task);

      const result = req.schema.safeParse(response.output_parsed);
      if (!result.success) {
        throw new AIOutputError(`Invalid ${req.task} output`, req.task, result.error);
      }
      return result.data;
    },

    async *streamText(req: StreamTextRequest): AsyncIterable<string> {
      const stream = client.responses.stream({
        model: MODELS.openai[req.model],
        reasoning: { effort: MODEL_EFFORT[req.model] },
        instructions: req.system,
        input: req.messages,
        max_output_tokens: req.maxTokens ?? 4000,
      });
      for await (const event of stream) {
        if (event.type === "response.output_text.delta") yield event.delta;
        if (event.type === "response.refusal.delta") throw new AIRefusalError(req.task);
      }
    },
  };
}
