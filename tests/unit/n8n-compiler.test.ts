import { describe, expect, it } from "vitest";
import { createMockProvider } from "@/lib/ai/mock";
import { writeBlueprint } from "@/lib/ai/tasks/blueprint";
import type { AIProvider } from "@/lib/ai/types";
import type { CoachDesign } from "@/lib/coach/context";
import { getPlatform, PLATFORMS } from "@/lib/config/platforms";
import { FIXTURE_PLANS, leaveRequestPlan } from "@/lib/export/fixtures";
import { planFromDesign } from "@/lib/export/from-design";
import { buildGuideMarkdown } from "@/lib/export/guide";
import { compileN8n, n8nCompiler, type N8nWorkflow } from "@/lib/export/n8n/compile";
import { N8N_TYPES } from "@/lib/export/n8n/templates";
import { block, link, planSchema, validatePlan, type Plan } from "@/lib/export/plan";

const KNOWN_TYPES = new Map<string, number>(Object.values(N8N_TYPES).map((t) => [t.type, t.typeVersion]));
const TRIGGER_TYPES = new Set<string>([N8N_TYPES.formTrigger.type, N8N_TYPES.scheduleTrigger.type, N8N_TYPES.webhook.type]);
const WAITS = (n: N8nWorkflow["nodes"][number]) => n.parameters.operation === "sendAndWait";

function checkWorkflow(json: string) {
  const wf = JSON.parse(json) as N8nWorkflow;
  const names = wf.nodes.map((n) => n.name);
  expect(new Set(names).size).toBe(names.length);
  expect(new Set(wf.nodes.map((n) => n.id)).size).toBe(wf.nodes.length);

  const incoming = new Set<string>();
  for (const [from, outputs] of Object.entries(wf.connections)) {
    expect(names).toContain(from);
    for (const [type, lists] of Object.entries(outputs)) {
      for (const list of lists) {
        for (const target of list) {
          expect(names).toContain(target.node);
          expect(target.type).toBe(type);
          incoming.add(target.node);
        }
      }
    }
  }

  for (const node of wf.nodes) {
    // Every node is a known template at its pinned version, with no credentials.
    expect(KNOWN_TYPES.get(node.type), node.type).toBe(node.typeVersion);
    expect(node).not.toHaveProperty("credentials");
    if (node.type === N8N_TYPES.stickyNote.type) continue;
    const isSubnode = node.type === N8N_TYPES.chatModel.type || node.type === N8N_TYPES.outputParser.type;
    if (TRIGGER_TYPES.has(node.type)) expect(incoming.has(node.name)).toBe(false);
    else if (!isSubnode) expect(incoming.has(node.name), `${node.name} has no input`).toBe(true);
    if (isSubnode) expect(wf.connections[node.name]).toBeDefined();
    if (TRIGGER_TYPES.has(node.type) && node.type !== N8N_TYPES.scheduleTrigger.type) expect(node.webhookId).toBeTruthy();
    if (WAITS(node)) expect(node.webhookId).toBeTruthy();
  }
  expect(wf.nodes.filter((n) => TRIGGER_TYPES.has(n.type))).toHaveLength(1);
  return wf;
}

const designs: CoachDesign[] = [
  {
    trigger: "Employee submits a leave request form",
    steps: "Check the balance in BambooHR and the leave spreadsheet",
    decision: "AI checks for clashes",
    action: "Send confirmation on WhatsApp and update the record",
    human: "Line manager approves exceptions in Slack",
    name: "Leave helper",
    hours_saved_per_month: 10,
    tools: ["WhatsApp"],
    systems: ["BambooHR", "Google Sheets"],
  },
  { trigger: "Every Monday morning", steps: "", decision: "Over 30 days late", action: "Email the customer", human: "Finance checks the list", name: "", hours_saved_per_month: null, tools: [], systems: [] },
  { trigger: "", steps: "", decision: "", action: "", human: "", name: "", hours_saved_per_month: null, tools: [], systems: [] },
  { trigger: "A new hire is created in Sage", steps: "Pull their details from Sage and Okta", decision: "Rule by department", action: "Post to Outlook", human: "IT approves access", name: "Onboarding", hours_saved_per_month: 4, tools: ["Microsoft 365"], systems: ["Sage", "Okta"] },
];

describe("plans", () => {
  it("fixture plans pass the schema and the semantic checks", () => {
    for (const plan of FIXTURE_PLANS) {
      expect(planSchema.safeParse(plan).success).toBe(true);
      expect(validatePlan(plan)).toEqual([]);
    }
  });

  it("catches broken plans", () => {
    const base = leaveRequestPlan;
    const twoTriggers: Plan = { ...base, blocks: [...base.blocks, block({ id: "again", kind: "webhook", slot: "trigger", label: "Again" })] };
    expect(validatePlan(twoTriggers).join(" ")).toMatch(/exactly one trigger/);
    expect(validatePlan({ ...base, links: [...base.links, link("log", "ghost")] }).join(" ")).toMatch(/unknown block "ghost"/);
    expect(validatePlan({ ...base, links: [...base.links, link("log", "balance")] }).join(" ")).toMatch(/loops/);
    expect(validatePlan({ ...base, links: base.links.filter((l) => l.to !== "log") }).join(" ")).toMatch(/Not connected.*log/);
    expect(validatePlan({ ...base, links: base.links.map((l) => (l.from === "rule" && l.branch === "true" ? { ...l, branch: "yes" } : l)) }).join(" ")).toMatch(
      /Branch "yes"/,
    );
    const noHuman: Plan = { ...base, blocks: base.blocks.filter((b) => b.kind !== "approval"), links: base.links.filter((l) => l.from !== "manager" && l.to !== "manager") };
    expect(validatePlan(noHuman).join(" ")).toMatch(/person must stay in control/);
  });

  it("the rule-based plan is valid for any design, even an empty one", () => {
    for (const design of designs) {
      const plan = planFromDesign(design);
      expect(planSchema.safeParse(plan).success).toBe(true);
      expect(validatePlan(plan)).toEqual([]);
    }
  });

  it("the rule-based plan reads tools and systems", () => {
    const plan = planFromDesign(designs[0]);
    expect(plan.blocks.find((b) => b.kind === "form_trigger")).toBeTruthy();
    expect(plan.blocks.find((b) => b.kind === "http_request")?.system).toBe("BambooHR");
    expect(plan.blocks.find((b) => b.kind === "ai_agent")).toBeTruthy();
    expect(plan.blocks.find((b) => b.kind === "whatsapp_send")).toBeTruthy();
    expect(plan.blocks.find((b) => b.kind === "approval")?.channel).toBe("slack");
    expect(planFromDesign(designs[1]).blocks[0].kind).toBe("schedule_trigger");
    expect(planFromDesign(designs[3]).blocks[0].kind).toBe("webhook");
    expect(planFromDesign(designs[3]).blocks.find((b) => b.slot === "action")?.kind).toBe("outlook_send");
  });
});

describe("n8n compiler", () => {
  it("compiles every fixture plan to valid, consistent workflow JSON", () => {
    for (const plan of FIXTURE_PLANS) checkWorkflow(n8nCompiler.compile(plan));
  });

  it("compiles every rule-based plan", () => {
    for (const design of designs) checkWorkflow(n8nCompiler.compile(planFromDesign(design)));
  });

  it("is deterministic", () => {
    expect(n8nCompiler.compile(leaveRequestPlan)).toBe(n8nCompiler.compile(leaveRequestPlan));
  });

  it("compiles the human slot to send-and-wait, with approve/decline branches", () => {
    const wf = compileN8n(leaveRequestPlan);
    const approval = wf.nodes.find((n) => n.name === "Line manager decides")!;
    expect(approval).toMatchObject({ type: "n8n-nodes-base.gmail", parameters: { operation: "sendAndWait", responseType: "approval" } });
    const check = wf.connections["Line manager decides"].main[0][0].node;
    expect(check).toBe("Line manager decides: approved?");
    expect(wf.connections[check].main[0][0].node).toBe("Confirm to employee");
    expect(wf.connections[check].main[1][0].node).toBe("Explain the decline");
  });

  it("wires IF and Switch branches to the right outputs", () => {
    const leave = compileN8n(leaveRequestPlan);
    expect(leave.connections["Enough days and no clash?"].main[0][0].node).toBe("Confirm to employee");
    expect(leave.connections["Enough days and no clash?"].main[1][0].node).toBe("Line manager decides");
    const cv = compileN8n(FIXTURE_PLANS[1]);
    const outs = cv.connections["Which band?"].main.map((o) => o[0]?.node);
    expect(outs).toEqual(["Invite to interview", "Recruiter decides", "Polite decline", "Recruiter decides"]);
    // A switch after the AI reads the AI's first output field.
    expect(JSON.stringify(cv.nodes.find((n) => n.name === "Which band?")!.parameters)).toContain("$json.output.band");
  });

  it("gives the AI agent a chat model and a structured output parser", () => {
    const wf = compileN8n(FIXTURE_PLANS[1]);
    expect(wf.connections["Score against the job model"].ai_languageModel[0][0].node).toBe("Score against the job");
    expect(wf.connections["Score against the job output"].ai_outputParser[0][0].node).toBe("Score against the job");
    const parser = wf.nodes.find((n) => n.name === "Score against the job output")!;
    expect(JSON.parse(parser.parameters.jsonSchemaExample as string)).toHaveProperty("band");
  });

  it("explains systems with no node in a sticky note, and leaves credentials empty", () => {
    const wf = compileN8n(leaveRequestPlan);
    const http = wf.nodes.find((n) => n.type === N8N_TYPES.httpRequest.type)!;
    expect(http.parameters.url).toMatch(/REPLACE/);
    const notes = wf.nodes.filter((n) => n.type === N8N_TYPES.stickyNote.type).map((n) => String(n.parameters.content));
    expect(notes.some((c) => c.includes("Connect Local HRIS"))).toBe(true);
    expect(notes[0]).toMatch(/not a finished build/);
    expect(notes[0]).toMatch(/credentials are empty/);
    expect(notes.some((c) => c.startsWith("## Human in control"))).toBe(true);
  });

  it("refuses to compile an invalid plan", () => {
    expect(() => compileN8n({ ...leaveRequestPlan, links: [] })).toThrow(/invalid plan/);
  });
});

describe("blueprint task", () => {
  const input = {
    case: { title: "Leave requests", story: "Requests arrive on WhatsApp.", cost: "", who_feels_it: "", function_name: "HR" },
    design: designs[0],
    platforms: ["n8n"],
  };

  it("uses the AI plan when it passes the checks", async () => {
    const result = await writeBlueprint(createMockProvider({ delayMs: 0 }), input);
    expect(result.source).toBe("ai");
    expect(result.plan.name).toBe(leaveRequestPlan.name);
  });

  it("retries once with the problems, then falls back to the rule-based plan", async () => {
    const prompts: string[] = [];
    const broken: AIProvider = {
      name: "mock",
      async generateObject<T>(req: { messages: { content: string }[] }) {
        prompts.push(req.messages[0].content);
        return { ...leaveRequestPlan, links: [] } as T;
      },
      async *streamText() {},
    };
    const result = await writeBlueprint(broken, input);
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toMatch(/last plan had these problems/);
    expect(result.source).toBe("rules");
    expect(validatePlan(result.plan)).toEqual([]);
  });

  it("falls back when the AI throws", async () => {
    const failing: AIProvider = {
      name: "mock",
      async generateObject() {
        throw new Error("timeout");
      },
      async *streamText() {},
    };
    expect((await writeBlueprint(failing, input)).source).toBe("rules");
  });
});

describe("build guides", () => {
  it("write a guide for every platform, slot by slot", () => {
    for (const platform of PLATFORMS) {
      const md = buildGuideMarkdown({ design: designs[0], plan: leaveRequestPlan, platform });
      expect(md).toContain(`build guide for ${platform.name}`);
      expect(md).toContain("### Human in control (keep this)");
      expect(md).toContain("not a finished build");
    }
    const md = buildGuideMarkdown({ design: designs[2], plan: null, platform: getPlatform("power-automate")! });
    expect(md).toContain("You left this empty");
  });
});
