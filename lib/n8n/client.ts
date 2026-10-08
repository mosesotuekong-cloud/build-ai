import type { AIProvider } from "@/lib/ai/types";
import { N8N_JOBS, type N8nJobInput, type N8nJobName, type N8nJobOutput } from "./jobs";

export const N8N_SECRET_HEADER = "x-builda-secret";

export class N8nError extends Error {
  constructor(
    message: string,
    readonly job: N8nJobName,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "N8nError";
  }
}

export type N8nClientOptions = {
  baseUrl?: string;
  secret?: string;
  provider: AIProvider;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

// The single way the app talks to n8n. With no base URL, jobs run locally
// through the AI provider so development needs no n8n instance.
export function createN8nClient({ baseUrl, secret, provider, fetchImpl = fetch, timeoutMs = 120_000 }: N8nClientOptions) {
  return {
    mode: baseUrl ? ("remote" as const) : ("local" as const),

    async run<N extends N8nJobName>(name: N, rawInput: N8nJobInput<N>): Promise<N8nJobOutput<N>> {
      const job = N8N_JOBS[name];
      const input = job.input.parse(rawInput);

      if (!baseUrl) {
        // Each job checks its own input shape above; the union of jobs needs a cast here.
        const run = job.runLocally as (p: AIProvider, i: unknown) => Promise<unknown>;
        return run(provider, input) as Promise<N8nJobOutput<N>>;
      }

      const url = `${baseUrl.replace(/\/+$/, "")}/${job.webhookPath}`;
      let response: Response;
      try {
        response = await fetchImpl(url, {
          method: "POST",
          headers: { "content-type": "application/json", ...(secret ? { [N8N_SECRET_HEADER]: secret } : {}) },
          body: JSON.stringify(input),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        throw new N8nError(`Could not reach n8n for "${name}"`, name, error);
      }
      if (!response.ok) {
        throw new N8nError(`n8n returned ${response.status} for "${name}"`, name);
      }

      const result = job.output.safeParse(await response.json().catch(() => undefined));
      if (!result.success) {
        throw new N8nError(`n8n returned an invalid result for "${name}"`, name, result.error);
      }
      return result.data as N8nJobOutput<N>;
    },
  };
}

export type N8nClient = ReturnType<typeof createN8nClient>;
