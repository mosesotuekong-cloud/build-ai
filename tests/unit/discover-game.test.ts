import { describe, expect, it } from "vitest";
import { discoveryScore, LEVELS, type ScoreInput } from "@/lib/discover/score";
import { buildaKnowledge } from "@/lib/discover/knowledge";
import { TWISTS, getTwist } from "@/lib/discover/twists";
import { VERDICTS } from "@/lib/discover/verdict";
import { REGIONS } from "@/lib/discover/regions";

const empty: ScoreInput = {
  fix: { eliminate: "", combine: "", simplify: "" },
  trigger: "",
  steps: "",
  decision: "",
  action: "",
  human: "",
  oversight: null,
  systems: [],
  rank: { value: null, effort: null, readiness: null, risk: null, reversibility: null },
  nudges: 0,
  twistAnswered: false,
  questionsAnswered: 0,
  businessEdited: false,
  downloaded: false,
};
const long = "one two three four five six seven eight nine";

describe("discovery score", () => {
  it("starts at zero as an Explorer", () => {
    const s = discoveryScore(empty);
    expect(s.points).toBe(0);
    expect(s.level).toBe("Explorer");
    expect(s.badges.every((b) => !b.earned)).toBe(true);
  });
  it("rewards detail and control, not just filling boxes", () => {
    const thin = discoveryScore({ ...empty, trigger: "email", steps: "read", decision: "decide", action: "send" });
    const rich = discoveryScore({ ...empty, trigger: long, steps: long, decision: `Rule: if amounts match ${long}`, action: long, oversight: "on", human: "Finance manager checks big ones" });
    expect(rich.points).toBeGreaterThan(thin.points);
    expect(rich.badges.find((b) => b.key === "designer")?.earned).toBe(true);
    expect(rich.badges.find((b) => b.key === "safety")?.earned).toBe(true);
    expect(rich.badges.find((b) => b.key === "decision")?.earned).toBe(true);
  });
  it("reaches Builder when everything is done well, capped at 200", () => {
    const all = discoveryScore({
      ...empty,
      fix: { eliminate: "a", combine: "b", simplify: "c" },
      trigger: long,
      steps: long,
      decision: `rule ${long}`,
      action: long,
      human: "the finance manager checks",
      oversight: "in",
      systems: ["Zoho", "Gmail"],
      rank: { value: 5, effort: "low", readiness: "ready", risk: "low", reversibility: "easy" },
      nudges: 1,
      twistAnswered: true,
      questionsAnswered: 5,
      businessEdited: true,
      downloaded: true,
    });
    expect(all.points).toBe(200);
    expect(all.level).toBe("Builder");
    expect(all.next).toBeNull();
    expect(all.badges.every((b) => b.earned)).toBe(true);
  });
  it("has levels in order", () => expect(LEVELS.map((l) => l.min)).toEqual([...LEVELS.map((l) => l.min)].sort((a, b) => a - b)));
});

describe("Ask Builda's knowledge", () => {
  const k = buildaKnowledge();
  it("describes every verdict and region the app uses", () => {
    for (const v of Object.values(VERDICTS)) expect(k).toContain(v.title);
    for (const r of REGIONS) expect(k).toContain(`${r.currency}${r.hourlyRate}/hour`);
  });
  it("explains the business case maths and the AI Act limits", () => {
    expect(k).toContain("Payback = build cost ÷ net a month");
    expect(k).toContain("Never more than 95% is automated");
    expect(k).toContain("not on its own take a system out of high-risk");
  });
  it("lists every twist", () => {
    for (const t of TWISTS) expect(k).toContain(t.title);
  });
});

describe("twists", () => {
  it("are unique and findable", () => {
    expect(new Set(TWISTS.map((t) => t.key)).size).toBe(TWISTS.length);
    expect(getTwist("no_api")?.title).toBe("No API access");
    expect(getTwist("nope")).toBeNull();
  });
});
