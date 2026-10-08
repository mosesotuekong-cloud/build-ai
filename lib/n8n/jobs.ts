import { z } from "zod";
import { caseGeneratorInputSchema, generatedDeckSchema } from "@/lib/ai/schemas/cases";
import { generateCases } from "@/lib/ai/tasks/generate-cases";
import type { AIProvider } from "@/lib/ai/types";

// Every piece of background work that runs in n8n. Each job names its webhook
// path, the shapes going in and out, and a local fallback that runs the same
// logic through the AI provider when N8N_WEBHOOK_BASE_URL is not set.
type JobDefinition<I extends z.ZodType, O extends z.ZodType> = {
  webhookPath: string;
  input: I;
  output: O;
  runLocally: (provider: AIProvider, input: z.output<I>) => Promise<z.output<O>>;
};

function defineJob<I extends z.ZodType, O extends z.ZodType>(job: JobDefinition<I, O>) {
  return job;
}

export const N8N_JOBS = {
  "generate-cases": defineJob({
    webhookPath: "builda/generate-cases",
    input: caseGeneratorInputSchema,
    output: generatedDeckSchema,
    runLocally: (provider, input) => generateCases(provider, input),
  }),
  // Messages a commitment's owner on its due date. Queued when a team commits
  // (see app/play/commitment-actions.ts); n8n reads the commitment by id and
  // sends the reminder. Locally nothing is sent.
  "commitment-follow-up": defineJob({
    webhookPath: "builda/commitment-follow-up",
    input: z.object({ commitment_id: z.uuid(), due_date: z.iso.date() }),
    output: z.object({ scheduled: z.boolean() }),
    runLocally: async () => ({ scheduled: false }),
  }),
  // "opportunity-map" is added in milestone 9.
};

export type N8nJobName = keyof typeof N8N_JOBS;
export type N8nJobInput<N extends N8nJobName> = z.input<(typeof N8N_JOBS)[N]["input"]>;
export type N8nJobOutput<N extends N8nJobName> = z.output<(typeof N8N_JOBS)[N]["output"]>;
