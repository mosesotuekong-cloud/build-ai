import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createMockProvider } from "@/lib/ai/mock";
import { reportProseSchema } from "@/lib/ai/schemas/report";
import type { AIProvider } from "@/lib/ai/types";
import { sampleReportInput, sampleReportProse } from "@/lib/report/fixtures";
import { aiBucket, beforeAfterFrom, buildOpportunityMap, learningFrom, teamReadiness } from "@/lib/report/map";
import { pdfText, renderReportPdf } from "@/lib/report/pdf";
import { anonymisedBrief, templateProse, writeReportProse } from "@/lib/report/prose";

const map = buildOpportunityMap(sampleReportInput);

describe("opportunity map", () => {
  it("ranks quick wins first and gives each use case a ref", () => {
    expect(map.useCases.map((u) => [u.ref, u.designName, u.bucket])).toEqual([
      ["UC1", "Leave in a minute", "quick_win"],
      ["UC2", "Day-one ready", "fix_data"],
      ["UC3", "Payslip helper", "park"],
    ]);
    expect(map.totals).toMatchObject({ teams: 3, players: 12, useCases: 3, hoursPerMonth: 32, quick_win: 1, fix_data: 1, park: 1, raised: 1, commitments: 1 });
  });

  it("keeps the team's view and the AI's view, and says where they disagree", () => {
    const payslip = map.useCases.find((u) => u.designName === "Payslip helper")!;
    expect(payslip.team.bucket).toBe("park");
    expect(payslip.ai?.bucket).toBe("quick_win");
    expect(payslip.disagreements.join(" ")).toMatch(/team placed this in Park; the AI would put it in Quick wins/);
    expect(payslip.disagreements.join(" ")).toMatch(/impact 2 of 5; the AI rated it 4/);
    expect(payslip.risk).toBe("high");
    expect(map.useCases[0].disagreements).toEqual([]);
  });

  it("flags what IT or sign-off must sort out first", () => {
    const leave = map.useCases[0];
    expect(leave.needsIT).toBe(true);
    expect(leave.itReasons).toEqual(expect.arrayContaining(["Personal data: check with data protection first", "Connects to Google Sheets"]));
    expect(map.useCases[1].itReasons).toContain("Data access needs confirming");
  });

  it("groups by platform, lists raised problems and commitments with owners", () => {
    expect(map.byPlatform.map((p) => [p.name, p.refs])).toEqual([
      ["n8n", ["UC1"]],
      ["Copilot Studio", ["UC2"]],
    ]);
    expect(map.raised.map((r) => r.title)).toEqual(["Exit interviews"]);
    expect(map.commitments).toEqual([expect.objectContaining({ ref: "UC1", owner_name: "Ada", due_date: "2026-10-20" })]);
  });

  it("compares before and after only for people who did both rounds", () => {
    const ba = beforeAfterFrom(sampleReportInput.checks)!;
    expect(ba).toMatchObject({ players: 2, before: 50, after: 64, change: 14, improved: 1 });
    expect(ba.criteria.map((c) => c.key).slice(0, 2)).toEqual(["human", "decision"]);
    expect(beforeAfterFrom([])).toBeNull();
    expect(buildOpportunityMap({ ...sampleReportInput, session: { ...sampleReportInput.session, beforeAfter: false } }).beforeAfter).toBeNull();
  });

  it("turns first design-check flags and coach use into learning facts", () => {
    const facts = learningFrom(sampleReportInput.teams);
    expect(facts[0].text).toBe("2 of 3 teams left out a human checkpoint until prompted.");
    expect(facts.find((f) => f.key === "coach")?.text).toBe("Teams asked the coach 4 times, most often about the human in control.");
    expect(facts.find((f) => f.key === "weakest_criterion")).toBeTruthy();
  });

  it("works out readiness and the AI's bucket the same way as the team's", () => {
    expect(teamReadiness({ data_location: "known", data_access: "yes", data_quality: "good" } as never)).toBe("ready");
    expect(teamReadiness({ data_location: null, data_access: "no", data_quality: null } as never)).toBe("not_ready");
    expect(aiBucket({ impact: 5, effort: 2, data_readiness: "partly" })).toBe("quick_win");
    expect(aiBucket({ impact: 5, effort: 2, data_readiness: "not_ready" })).toBe("fix_data");
    expect(aiBucket({ impact: 2, effort: 1, data_readiness: "ready" })).toBe("park");
  });

  it("copes with a session where nobody finished", () => {
    const empty = buildOpportunityMap({ ...sampleReportInput, teams: [], checks: [] });
    expect(empty.useCases).toEqual([]);
    expect(reportProseSchema.safeParse(templateProse(empty)).success).toBe(true);
  });
});

describe("report prose", () => {
  it("never sends team names or owners to the AI", () => {
    const brief = anonymisedBrief(map);
    for (const name of ["Night Owls", "Early Birds", "Lions", "Ada"]) expect(brief).not.toContain(name);
    expect(brief).toContain("UC1: Leave in a minute");
  });

  it("uses the AI's words, dropping notes for refs that don't exist", async () => {
    const provider: AIProvider = {
      name: "mock",
      async generateObject<T>() {
        return { ...sampleReportProse, use_case_notes: [...sampleReportProse.use_case_notes, { ref: "UC9", note: "Made up use case note." }] } as T;
      },
      async *streamText() {},
    };
    const { prose, source } = await writeReportProse(provider, map);
    expect(source).toBe("ai");
    expect(prose.use_case_notes.map((n) => n.ref)).toEqual(["UC1", "UC2"]);
  });

  it("falls back to templates when the AI fails", async () => {
    const failing: AIProvider = {
      name: "mock",
      async generateObject() {
        throw new Error("timeout");
      },
      async *streamText() {},
    };
    const { prose, source } = await writeReportProse(failing, map);
    expect(source).toBe("template");
    expect(reportProseSchema.safeParse(prose).success).toBe(true);
    expect(prose.headline).toBe("3 automations found, 1 ready to start now.");
    expect(prose.use_case_notes).toHaveLength(3);
  });

  it("works with the mock provider", async () => {
    expect((await writeReportProse(createMockProvider({ delayMs: 0 }), map)).source).toBe("ai");
  });
});

describe("PDF", () => {
  it("renders a PDF", async () => {
    const pdf = await renderReportPdf(map, templateProse(map));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(3000);
  }, 30_000);

  it("keeps text inside what the PDF font can draw", () => {
    expect(pdfText("Saves ₦50,000 → fast ✅ “quoted” — fine")).toBe("Saves NGN 50,000 -> fast  “quoted” — fine");
  });
});
