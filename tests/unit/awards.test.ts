import { describe, expect, it } from "vitest";
import { RUBRIC, type ScoredCriterion } from "@/lib/ai/schemas/judge";
import { checkScoreFrom } from "@/lib/ai/tasks/judge-design";
import { computeAwards, rankTeams } from "@/lib/judging/awards";

const breakdown = (scores: Partial<Record<string, number>>): ScoredCriterion[] =>
  RUBRIC.map((r) => ({ key: r.key, label: r.label, max: r.max, score: scores[r.key] ?? 0, reasoning: "" }));

const teams = [
  { id: "a", name: "Alpha", final: 70, breakdown: breakdown({ trigger: 12, steps: 14, decision: 12, action: 10, human: 18, hours: 4 }) },
  { id: "b", name: "Bravo", final: 82, breakdown: breakdown({ trigger: 14, steps: 16, decision: 18, action: 12, human: 15, hours: 7 }) },
  { id: "c", name: "Charlie", final: 60, breakdown: breakdown({ trigger: 15, steps: 10, decision: 10, action: 10, human: 10, hours: 9 }) },
];

describe("leaderboard and awards", () => {
  it("ranks by final score", () => {
    expect(rankTeams(teams).map((t) => t.id)).toEqual(["b", "a", "c"]);
  });

  it("gives three awards: top design, best control and best rule-or-AI call", () => {
    const awards = computeAwards(teams);
    expect(awards.map((a) => a.key)).toEqual(["winner", "human", "decision"]);
    expect(awards[0]).toMatchObject({ key: "winner", teamId: "b" });
    expect(awards.find((a) => a.key === "human")?.teamId).toBe("a");
    // Bravo has the best decision score but already won; Charlie is next with a score.
    expect(awards.find((a) => a.key === "decision")?.teamId).toBe("c");
  });

  it("lets a team win again only when everyone has already won", () => {
    const awards = computeAwards(teams.slice(0, 1));
    expect(awards.find((a) => a.key === "human")?.teamId).toBe("a");
  });

  it("never awards a criterion nobody scored on, and handles no teams", () => {
    const zeroDecision = [{ ...teams[0], breakdown: breakdown({ human: 10 }) }];
    expect(computeAwards(zeroDecision).find((a) => a.key === "decision")).toBeUndefined();
    expect(computeAwards([])).toEqual([]);
  });
});

describe("solo round scores", () => {
  it("leave out hours and scale to 100", () => {
    expect(checkScoreFrom(breakdown({ trigger: 15, steps: 20, decision: 20, action: 15, human: 20, hours: 0 }))).toBe(100);
    expect(checkScoreFrom(breakdown({ trigger: 9, steps: 9, decision: 9, action: 9, human: 9 }))).toBe(50);
  });
});
