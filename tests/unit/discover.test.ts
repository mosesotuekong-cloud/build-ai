import { describe, expect, it } from "vitest";
import { readinessScore, strengthenSchema } from "@/lib/ai/schemas/discovery";
import { strengthenFixture } from "@/lib/ai/fixtures/discovery";
import { coachDesign, discoveryDesignSchema, playerFor, setupSchema, toDiscovery } from "@/lib/discover/model";
import { leaveRequestPlan } from "@/lib/export/fixtures";
import { mcpServer, mcpToolSpec, toolInputs, toolName, workflowAsTool } from "@/lib/export/n8n/mcp";
import { validatePlan } from "@/lib/export/plan";
import { situationText } from "@/lib/ai/tasks/discovery";

const base = toDiscovery({
  id: "11111111-1111-1111-1111-111111111111",
  function_slug: "finance",
  players: 3,
  player_names: ["Ada", "", "Chidi"],
  stack: ["n8n", "power-automate"],
  region: "uk",
  stage: "cards",
  challenge: { title: "Invoices nobody can find", story: "Invoices arrive by email and get lost in a shared inbox every month.", cost: "About two days a month.", who_feels_it: "Accounts payable", source: "own" },
  design: { trigger: "An invoice email arrives", action: "Book it for payment", systems: ["Outlook", "Xero"] },
  rank: { value: 4, readiness: "partly", risk: "medium" },
  created_at: "2026-10-25T10:00:00Z",
});

describe("quick discovery model", () => {
  it("reads a row safely, filling in empty cards", () => {
    expect(base.design.decision).toBe("");
    expect(base.design.oversight).toBeNull();
    expect(base.plan).toBeNull();
    expect(toDiscovery({ id: "x", function_slug: "hr", design: { trigger: 42 } }).design.trigger).toBe("");
  });

  it("goes round the table, with Player N for blank names", () => {
    expect(playerFor(base, 0)).toBe("Ada");
    expect(playerFor(base, 1)).toBe("Player 2");
    expect(playerFor(base, 2)).toBe("Chidi");
    expect(playerFor(base, 3)).toBe("Ada");
    expect(playerFor({ players: 1, player_names: [] }, 0)).toBeNull();
  });

  it("never sends player names to the AI", () => {
    const text = situationText(base);
    expect(text).toContain("3 people");
    expect(text).not.toContain("Ada");
    expect(text).not.toContain("Chidi");
    expect(text).toContain("Invoices nobody can find");
  });

  it("builds the strengthened design once there is one", () => {
    expect(coachDesign(base).trigger).toBe("An invoice email arrives");
    const strong = { ...base, strengthened: strengthenFixture };
    expect(coachDesign(strong).trigger).toBe(strengthenFixture.design.trigger);
    expect(coachDesign(strong).oversight).toBe("on");
    expect(coachDesign(strong).systems).toEqual(["Outlook", "Xero"]);
  });

  it("validates the setup", () => {
    expect(setupSchema.safeParse({ function_slug: "hr", players: 2, player_names: ["A", "B"], stack: ["n8n"], region: "nigeria" }).success).toBe(true);
    expect(setupSchema.safeParse({ function_slug: "hr", players: 2, player_names: [], stack: [], region: "uk" }).success).toBe(false);
    expect(setupSchema.safeParse({ function_slug: "nope", players: 1, player_names: [], stack: ["n8n"], region: "uk" }).success).toBe(false);
    expect(setupSchema.safeParse({ function_slug: "hr", players: 9, player_names: [], stack: ["n8n"], region: "uk" }).success).toBe(false);
  });

  it("caps card text", () => {
    expect(discoveryDesignSchema.safeParse({ trigger: "x".repeat(601) }).success).toBe(false);
  });
});

describe("readiness score", () => {
  const dims = (n: number) => (["value", "data", "access", "risk", "people"] as const).map((key) => ({ key, score: n, note: "note" }));
  it("maps 1–5 onto 0–100", () => {
    expect(readinessScore(dims(1))).toBe(0);
    expect(readinessScore(dims(5))).toBe(100);
    expect(readinessScore(dims(3))).toBe(50);
    expect(readinessScore(strengthenFixture.readiness)).toBe(55);
  });
  it("requires all five dimensions from the AI", () => {
    expect(strengthenSchema.safeParse({ ...strengthenFixture, readiness: dims(3).slice(0, 4) }).success).toBe(false);
  });
});

describe("MCP tool export", () => {
  it("names the tool and takes the trigger form's questions as inputs", () => {
    expect(validatePlan(leaveRequestPlan)).toEqual([]);
    expect(toolName(leaveRequestPlan)).toMatch(/^[a-z0-9_]+$/);
    expect(toolInputs(leaveRequestPlan).length).toBeGreaterThan(0);
    const spec = mcpToolSpec(leaveRequestPlan, ["n8n"]);
    expect(spec.inputSchema.required).toEqual(toolInputs(leaveRequestPlan).map((i) => i.name));
  });

  it("falls back to one free-text input when there is no form", () => {
    const plan = { ...leaveRequestPlan, blocks: leaveRequestPlan.blocks.map((b) => (b.kind === "form_trigger" ? { ...b, kind: "webhook" as const, fields: null } : b)) };
    expect(toolInputs(plan)).toEqual([expect.objectContaining({ name: "request_details" })]);
  });

  it("wires the MCP server's tool and a second trigger into the workflow", () => {
    const server = mcpServer(leaveRequestPlan);
    const tool = server.nodes.find((n) => n.type === "@n8n/n8n-nodes-langchain.toolWorkflow")!;
    expect(server.connections[tool.name].ai_tool[0][0]).toEqual({ node: "MCP Server", type: "ai_tool", index: 0 });
    expect(server.nodes.find((n) => n.name === "MCP Server")?.parameters.authentication).toBe("bearerAuth");

    const wf = workflowAsTool(leaveRequestPlan);
    const extra = wf.nodes.find((n) => n.name === "When called as a tool")!;
    expect(extra.type).toBe("n8n-nodes-base.executeWorkflowTrigger");
    const original = wf.nodes.find((n) => n.type === "n8n-nodes-base.formTrigger")!;
    expect(wf.connections[extra.name]).toEqual(wf.connections[original.name]);
  });
});

describe("glitch guard", () => {
  it("spots and strips stray characters from other scripts", async () => {
    const { hasGlitch, stripGlitches } = await import("@/lib/ai/tasks/discovery");
    const bad = { changes: ["Hold before payment한다ft is safer.your exact Xero流程"] };
    expect(hasGlitch(bad)).toBe(true);
    expect(stripGlitches(bad).changes[0]).toBe("Hold before paymentft is safer.your exact Xero");
    expect(hasGlitch({ text: "Café, naïve, £5,000 – “quotes” and ₦1.2m" })).toBe(false);
  });
});
