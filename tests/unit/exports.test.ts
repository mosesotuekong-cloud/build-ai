import { describe, expect, it } from "vitest";
import type { CoachDesign } from "@/lib/coach/context";
import { copilotAgentPackage, declarativeAgent } from "@/lib/export/copilot/agent";
import { databricksBundle } from "@/lib/export/databricks/bundle";
import { routing } from "@/lib/export/data-job";
import { fabricPackage } from "@/lib/export/fabric/package";
import { FIXTURE_PLANS, leaveRequestPlan, paymentReminderPlan } from "@/lib/export/fixtures";
import { packagesFor } from "@/lib/export/packages";
import { compilePowerAutomate, powerAutomatePackage } from "@/lib/export/power-automate/compile";
import { quartzFrom, recurrenceFrom } from "@/lib/export/schedule";
import { unzip } from "@/lib/export/zip";

const design: CoachDesign = {
  trigger: "A leave form",
  steps: "Check the balance",
  decision: "Approve when the balance covers it and nobody else is off.",
  action: "Confirm and record it",
  human: "The line manager decides every other request.",
  name: "Leave helper",
  hours_saved_per_month: 10,
  tools: [],
  systems: [],
  oversight: "in",
  fix: null,
};

type Action = { type: string; runAfter: Record<string, string[]>; actions?: Record<string, Action>; else?: { actions: Record<string, Action> }; cases?: Record<string, { actions: Record<string, Action> }>; default?: { actions: Record<string, Action> } };

// Every action in every scope, with the scope it sits in.
function walk(scope: Record<string, Action>, visit: (key: string, a: Action, scope: Record<string, Action>) => void) {
  for (const [key, a] of Object.entries(scope)) {
    visit(key, a, scope);
    if (a.actions) walk(a.actions, visit);
    if (a.else) walk(a.else.actions, visit);
    for (const c of Object.values(a.cases ?? {})) walk(c.actions, visit);
    if (a.default) walk(a.default.actions, visit);
  }
}

describe("schedules", () => {
  it("reads the team's words", () => {
    expect(recurrenceFrom("every weekday at 8am")).toMatchObject({ frequency: "Week", schedule: { weekDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], hours: ["8"] } });
    expect(recurrenceFrom("daily at 5pm")).toMatchObject({ frequency: "Day", schedule: { hours: ["17"] } });
    expect(recurrenceFrom("every 15 minutes")).toMatchObject({ frequency: "Minute", interval: 15 });
    expect(quartzFrom("every weekday at 8am")).toBe("0 0 8 ? * MON-FRI");
    expect(quartzFrom("every day at 6am")).toBe("0 0 6 * * ?");
    expect(quartzFrom(null)).toBe("0 0 9 ? * MON-FRI");
  });
});

describe("Power Automate", () => {
  it.each(FIXTURE_PLANS.map((p) => [p.name, p]))("compiles %s into a well-formed flow", (_name, plan) => {
    const flow = compilePowerAutomate(plan);
    const keys: string[] = [];
    walk(flow.definition.actions as Record<string, Action>, (key, a, scope) => {
      keys.push(key);
      for (const after of Object.keys(a.runAfter)) expect(scope, `${key} runs after ${after} in the same scope`).toHaveProperty(after);
    });
    expect(new Set(keys).size).toBe(keys.length);
    expect(Object.keys(flow.definition.triggers as object)).toHaveLength(1);
    // A person stays in control: every approval in the plan becomes a waiting approval.
    expect(JSON.stringify(flow.definition)).toContain("StartAndWaitForAnApproval");
  });

  it("copies a step reached from two branches into each, so each path keeps its meaning", () => {
    const flow = compilePowerAutomate(leaveRequestPlan);
    const rule = (flow.definition.actions as Record<string, Action>)["Enough_days_and_no_clash"];
    expect(Object.keys(rule.actions!)).toContain("Confirm_to_employee");
    const approved = rule.else!.actions["Line_manager_decides_approved"];
    expect(Object.keys(approved.actions!)).toContain("Confirm_to_employee_2");
    expect(Object.keys(approved.else!.actions)).toContain("Explain_the_decline");
  });

  it("flags premium steps and packages the connectors for mapping on import", () => {
    expect(compilePowerAutomate(leaveRequestPlan).premium).toEqual(["Check team leave in HRIS"]);
    const files = unzip(powerAutomatePackage(leaveRequestPlan));
    const manifest = JSON.parse(files.get("manifest.json")!.toString());
    const defPath = [...files.keys()].find((k) => k.endsWith("definition.json"))!;
    const def = JSON.parse(files.get(defPath)!.toString());
    const apis = JSON.parse(files.get(defPath.replace("definition.json", "apisMap.json"))!.toString());
    expect(Object.keys(def.properties.connectionReferences).sort()).toEqual(Object.keys(apis).sort());
    expect(Object.keys(apis).sort()).toEqual(["shared_approvals", "shared_office365"]);
    for (const res of Object.values(apis)) expect(manifest.resources).toHaveProperty(res as string);
    // No credentials travel in the file.
    expect(JSON.stringify(def)).not.toMatch(/password|secret|apikey/i);
  });

  it("is deterministic", () => {
    expect(powerAutomatePackage(leaveRequestPlan).equals(powerAutomatePackage(leaveRequestPlan))).toBe(true);
  });
});

describe("Copilot agent", () => {
  it("stays within the declarative agent limits and keeps the person in control", () => {
    for (const plan of FIXTURE_PLANS) {
      const agent = declarativeAgent({ plan, design });
      expect(agent.version).toBe("v1.5");
      expect(agent.name.length).toBeLessThanOrEqual(100);
      expect(agent.description.length).toBeLessThanOrEqual(1000);
      expect(agent.instructions.length).toBeLessThanOrEqual(8000);
      expect(agent.conversation_starters.length).toBeLessThanOrEqual(12);
      expect(agent.disclaimer.text.length).toBeLessThanOrEqual(500);
      expect(agent.instructions).toContain("You never make or announce those decisions yourself");
    }
    expect(declarativeAgent({ plan: leaveRequestPlan, design }).instructions).toContain(design.human);
  });

  it("packages an app manifest, the agent and both icons", () => {
    const files = unzip(copilotAgentPackage({ plan: leaveRequestPlan, design }));
    expect([...files.keys()].sort()).toEqual(["color.png", "declarativeAgent.json", "manifest.json", "outline.png"]);
    const manifest = JSON.parse(files.get("manifest.json")!.toString());
    expect(manifest.copilotAgents.declarativeAgents[0].file).toBe("declarativeAgent.json");
    expect(manifest.name.short.length).toBeLessThanOrEqual(30);
    expect(files.get("color.png")!.readUInt32BE(16)).toBe(192);
    expect(files.get("outline.png")!.readUInt32BE(16)).toBe(32);
  });
});

describe("Databricks and Fabric", () => {
  it("routes each step to the cases that reach it, in the right notebook", () => {
    const r = routing(leaveRequestPlan);
    expect(r.get("confirm")).toEqual({ prep: "route_rule = true", apply: "approval_step = 'manager' AND decision = 'approved'" });
    expect(r.get("decline")).toEqual({ prep: null, apply: "approval_step = 'manager' AND decision = 'declined'" });
    expect(r.get("manager")).toEqual({ prep: "route_rule = false", apply: null });
  });

  it("builds a bundle with paused jobs and both notebooks", () => {
    const files = unzip(databricksBundle(leaveRequestPlan));
    const yml = files.get("databricks.yml")!.toString();
    expect(yml).toContain("pause_status: PAUSED");
    expect(yml).not.toContain("pause_status: UNPAUSED");
    for (const m of yml.matchAll(/notebook_path: \.\/(\S+)/g)) expect(files.has(m[1])).toBe(true);
    const prep = files.get("src/01_prepare_and_decide.py")!.toString();
    expect(prep.startsWith("# Databricks notebook source")).toBe(true);
    expect(prep).toContain('saveAsTable(T("review"))');
    // Messages only go to the outbox; nothing is sent by the starter.
    expect(prep).not.toMatch(/smtplib|sendMail/);
  });

  it("uses the schedule the team chose", () => {
    expect(unzip(databricksBundle(paymentReminderPlan)).get("databricks.yml")!.toString()).toContain('"0 0 8 ? * MON-FRI"');
  });

  it("builds Fabric notebooks and pipelines", () => {
    const files = unzip(fabricPackage(leaveRequestPlan));
    const nb = JSON.parse(files.get("notebooks/leave_request_helper_prepare_and_decide.ipynb")!.toString());
    expect(nb.nbformat).toBe(4);
    expect(nb.cells.some((c: { source: string[] }) => c.source.join("").includes('T("review")'))).toBe(true);
    const pipeline = JSON.parse(files.get("pipelines/leave_request_helper_apply_decisions.json")!.toString());
    expect(pipeline.properties.activities[0].type).toBe("TridentNotebook");
    expect(files.get("README.md")!.toString()).toContain("review");
  });
});

describe("which packages a stack gets", () => {
  it("offers each package only for its own stack", () => {
    expect(packagesFor(["n8n", "zoho"])).toEqual([]);
    expect(packagesFor(["power-automate", "m365-copilot"]).map((p) => p.key)).toEqual(["power-automate", "copilot-agent"]);
    expect(packagesFor(["databricks-genie", "fabric"]).map((p) => p.key)).toEqual(["databricks", "fabric"]);
  });
});
