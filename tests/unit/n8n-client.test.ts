import { describe, expect, it, vi } from "vitest";
import { createMockProvider } from "@/lib/ai/mock";
import { caseFixtures } from "@/lib/ai/fixtures/cases";
import { createN8nClient, N8N_SECRET_HEADER, N8nError } from "@/lib/n8n/client";

const provider = createMockProvider({ delayMs: 0 });
const input = { function_slug: "finance", function_name: "Finance", industry: "Retail", company_size: "50 staff" };

describe("n8n client", () => {
  it("runs jobs locally through the AI provider when no base URL is set", async () => {
    const fetchImpl = vi.fn();
    const client = createN8nClient({ provider, fetchImpl });
    expect(client.mode).toBe("local");
    const deck = await client.run("generate-cases", input);
    expect(deck.cases).toHaveLength(6);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("calls the webhook with the shared secret and validates the reply", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(caseFixtures.finance), { status: 200 }));
    const client = createN8nClient({ baseUrl: "https://n8n.example.com/webhook/", secret: "s3cret", provider, fetchImpl });

    const deck = await client.run("generate-cases", input);

    expect(deck.cases).toHaveLength(6);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://n8n.example.com/webhook/builda/generate-cases");
    expect((init.headers as Record<string, string>)[N8N_SECRET_HEADER]).toBe("s3cret");
    expect(JSON.parse(init.body as string)).toMatchObject({ function_slug: "finance", country: "Nigeria" });
  });

  it("rejects an invalid reply from n8n", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ cases: [] }), { status: 200 }));
    const client = createN8nClient({ baseUrl: "https://n8n.example.com/webhook", provider, fetchImpl });
    await expect(client.run("generate-cases", input)).rejects.toBeInstanceOf(N8nError);
  });

  it("reports HTTP errors from n8n", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    const client = createN8nClient({ baseUrl: "https://n8n.example.com/webhook", provider, fetchImpl });
    await expect(client.run("generate-cases", input)).rejects.toThrow(/500/);
  });

  it("validates input before sending anything", async () => {
    const fetchImpl = vi.fn();
    const client = createN8nClient({ baseUrl: "https://n8n.example.com/webhook", provider, fetchImpl });
    // @ts-expect-error industry is required
    await expect(client.run("generate-cases", { function_slug: "hr", function_name: "HR", company_size: "10" })).rejects.toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
