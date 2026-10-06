import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { MODELS, MODEL_EFFORT } from "@/lib/config/models";
import { AIOutputError, AIRefusalError, type AIProvider, type GenerateObjectRequest, type StreamTextRequest } from "./types";

// Haiku 4.5 does not accept the effort setting or server-side fallbacks.
function modelOptions(role: keyof typeof MODELS) {
  const model = MODELS[role];
  if (model.startsWith("claude-haiku")) return { model };
  return {
    model,
    output_config: { effort: MODEL_EFFORT[role] },
    // On a policy decline, the API re-runs the request on a suitable fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default" as const,
  };
}

export function createAnthropicProvider(apiKey: string): AIProvider {
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 120_000 });

  return {
    name: "anthropic",

    async generateObject<T>(req: GenerateObjectRequest<T>): Promise<T> {
      const { output_config, ...rest } = modelOptions(req.model);
      const response = await client.beta.messages.parse({
        ...rest,
        max_tokens: req.maxTokens ?? 16000,
        system: req.system,
        messages: req.messages,
        output_config: { ...output_config, format: zodOutputFormat(req.schema) },
      });

      if (response.stop_reason === "refusal") throw new AIRefusalError(req.task);

      // Validate again with our own schema; never trust the shape blindly.
      const result = req.schema.safeParse(response.parsed_output);
      if (!result.success) {
        throw new AIOutputError(`Invalid ${req.task} output`, req.task, result.error);
      }
      return result.data;
    },

    async *streamText(req: StreamTextRequest): AsyncIterable<string> {
      const stream = client.beta.messages.stream({
        ...modelOptions(req.model),
        max_tokens: req.maxTokens ?? 4000,
        system: req.system,
        messages: req.messages,
      });
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield event.delta.text;
        }
      }
      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal") throw new AIRefusalError(req.task);
    },
  };
}
