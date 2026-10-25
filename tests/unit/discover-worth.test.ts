import { describe, expect, it } from "vitest";
import { keywordCheck } from "@/lib/discover/ai-act";
import { businessCase, defaultInputs, paybackText, type BusinessInputs } from "@/lib/discover/business";
import { aiActOf, businessInputsOf, verdictOf } from "@/lib/discover/insights";
import { toDiscovery } from "@/lib/discover/model";
import { getRegion, money } from "@/lib/discover/regions";
import { gridPosition, verdictFrom } from "@/lib/discover/verdict";
import { strengthenFixture } from "@/lib/ai/fixtures/discovery";
import { pdfText } from "@/lib/report/pdf";

const base = { value: 4, effort: "low", readiness: "ready", risk: "low", reversibility: "easy", oversight: "on" } as const;

describe("verdict", () => {
  it("funds valuable, easy, ready, safe work", () => expect(verdictFrom(base)).toBe("fund"));
  it("parks low value whatever else", () => expect(verdictFrom({ ...base, value: 2 })).toBe("park"));
  it("fixes the data first when it isn't ready", () => expect(verdictFrom({ ...base, readiness: "not_yet", effort: "high" })).toBe("fix_data"));
  it("plans big, risky or partly ready work", () => {
    expect(verdictFrom({ ...base, effort: "high" })).toBe("plan");
    expect(verdictFrom({ ...base, risk: "high" })).toBe("plan");
    expect(verdictFrom({ ...base, readiness: "partly" })).toBe("plan");
  });
  it("plans irreversible actions unless a person approves every case", () => {
    expect(verdictFrom({ ...base, reversibility: "cannot", oversight: "on" })).toBe("plan");
    expect(verdictFrom({ ...base, reversibility: "cannot", oversight: "in" })).toBe("fund");
  });
  it("waits for value and readiness", () => expect(verdictFrom({ ...base, value: null })).toBeNull());
  it("places it on the value × effort grid", () => {
    expect(gridPosition({ value: 5, effort: "low" })).toEqual({ x: 0.18, y: 1 });
    expect(gridPosition({ value: 1, effort: null })).toBeNull();
  });
});

describe("business case", () => {
  const i: BusinessInputs = { cases_per_month: 200, minutes_per_case: 15, automatable_share: 0.6, hourly_rate: 30, build_days: 10, build_day_rate: 500, running_cost_per_month: 100, source: "edited" };
  const r = businessCase(i);
  const likely = r.scenarios.find((s) => s.key === "likely")!;
  it("works out today's time and cost", () => {
    expect(r.hoursTodayPerMonth).toBe(50);
    expect(r.costTodayPerMonth).toBe(1500);
  });
  it("works out the likely saving and payback", () => {
    expect(likely.hoursSavedPerMonth).toBe(30);
    expect(likely.netPerMonth).toBe(800);
    expect(likely.buildCost).toBe(5000);
    expect(likely.paybackMonths).toBeCloseTo(6.25);
    expect(likely.firstYearNet).toBe(4600);
    expect(paybackText(likely.paybackMonths)).toBe("7 months");
  });
  it("orders the scenarios and caps automation at 95%", () => {
    const [low, , high] = r.scenarios;
    expect(low.netPerMonth).toBeLessThan(likely.netPerMonth);
    expect(high.netPerMonth).toBeGreaterThan(likely.netPerMonth);
    expect(businessCase({ ...i, automatable_share: 1 }).scenarios[2].hoursSavedPerMonth).toBeCloseTo(50 * 0.95);
  });
  it("says when it never pays back", () => {
    const loss = businessCase({ ...i, running_cost_per_month: 5000 }).scenarios[1];
    expect(loss.paybackMonths).toBeNull();
    expect(paybackText(loss.paybackMonths)).toBe("Doesn't pay back");
  });
  it("starts from the team's guess and the region's rates", () => {
    const d = defaultInputs({ hoursSavedGuess: 30, blocks: 8, region: getRegion("nigeria") });
    expect(d.hourly_rate).toBe(6000);
    expect(businessCase(d).scenarios[1].hoursSavedPerMonth).toBeCloseTo(30, 0);
  });
  it("formats money, and PDFs keep the minus sign", () => {
    expect(money(12400, "£")).toBe("£12,400");
    expect(money(1_250_000, "₦")).toBe("₦1.3m");
    expect(pdfText(money(-500, "£"))).toBe("-£500");
  });
});

describe("EU AI Act first read", () => {
  it("flags recruitment as high-risk", () => {
    const c = keywordCheck("AI scores every CV and shortlists candidates for interview");
    expect(c.category).toBe("high_risk");
    expect(c.area).toContain("recruitment");
  });
  it("flags promotion and monitoring staff", () => expect(keywordCheck("Rank staff for promotion using performance ratings").category).toBe("high_risk"));
  it("flags emotion recognition at work as banned", () => expect(keywordCheck("Detect emotion of agents on calls").category).toBe("prohibited"));
  it("flags chatbots for transparency", () => expect(keywordCheck("A WhatsApp bot answers staff questions").category).toBe("transparency"));
  it("calls invoice matching minimal", () => expect(keywordCheck("Match supplier invoices to purchase orders in Xero").category).toBe("minimal"));
});

describe("insights for a discovery", () => {
  const d = toDiscovery({
    id: "x",
    function_slug: "hr",
    region: "europe",
    challenge: { title: "CV pile-up", story: "Recruiters read every CV by hand and miss good candidates.", cost: "", who_feels_it: "", source: "own" },
    design: { trigger: "A candidate applies", decision: "AI scores the CV", action: "Invite the top ones", oversight: "on", hours_saved_per_month: 20 },
    rank: { value: 4, effort: "medium", readiness: "ready", risk: "high", reversibility: "cannot" },
  });
  it("uses the keyword check, then the AI's once strengthened", () => {
    expect(aiActOf(d).category).toBe("high_risk");
    expect(aiActOf(d).source).toBe("keywords");
    const strong = { ...d, strengthened: strengthenFixture };
    expect(aiActOf(strong).source).toBe("ai");
  });
  it("plans a high-risk hiring tool", () => expect(verdictOf(d).verdict).toBe("plan"));
  it("takes business inputs from the AI once strengthened, unless edited", () => {
    expect(businessInputsOf(d).source).toBe("guess");
    expect(businessInputsOf(d).hourly_rate).toBe(38);
    const strong = { ...d, strengthened: strengthenFixture };
    expect(businessInputsOf(strong)).toMatchObject({ source: "ai", cases_per_month: 120 });
    const edited = { ...strong, business: { ...businessInputsOf(strong), cases_per_month: 999, source: "edited" as const } };
    expect(businessInputsOf(edited).cases_per_month).toBe(999);
  });
  it("loads strengthened results saved before the new fields", () => {
    const old: Record<string, unknown> = { ...strengthenFixture };
    delete old.estimates;
    delete old.ai_act;
    expect(toDiscovery({ id: "y", function_slug: "hr", strengthened: old }).strengthened).not.toBeNull();
  });
});

describe("verdict without enough answers", () => {
  it("says exactly what's missing", () => {
    const d = toDiscovery({ id: "z", function_slug: "finance", rank: { effort: "high", readiness: "partly", reversibility: "cannot" } });
    const v = verdictOf(d);
    expect(v.verdict).toBeNull();
    expect(v.reasons).toEqual(["To get a verdict, answer how much it's worth on the Worth it? card."]);
  });
});
