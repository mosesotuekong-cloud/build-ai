import { describe, expect, it } from "vitest";
import { assignCheckCard, CHECK_CARDS, CHECK_PAIRS, getCheckCard } from "@/lib/checks/cards";
import { HR_DEFAULT_CASES } from "@/lib/decks/hr-default";
import { EMPTY_SCORECARD, portfolioBucket, scorecardPatchSchema, scorecardProgress, suggestAiKind } from "@/lib/discovery/scorecard";

describe("check card bank", () => {
  it("has complete matched pairs with unique ids", () => {
    expect(new Set(CHECK_CARDS.map((c) => c.id)).size).toBe(CHECK_CARDS.length);
    for (const pair of CHECK_PAIRS) {
      const sides = CHECK_CARDS.filter((c) => c.pair === pair).map((c) => c.side).sort();
      expect(sides, pair).toEqual(["a", "b"]);
    }
    expect(CHECK_PAIRS.length).toBeGreaterThanOrEqual(6);
  });

  it("never reuses the default HR deck or the recruitment worked example", () => {
    const deckTitles = HR_DEFAULT_CASES.map((c) => c.title.toLowerCase());
    for (const card of CHECK_CARDS) {
      expect(deckTitles).not.toContain(card.title.toLowerCase());
      expect(card.story.toLowerCase()).not.toMatch(/\bcv\b|candidate|recruit/);
    }
  });

  it("gives each player the two sides of one pair, the same every time", () => {
    for (const id of ["player-1", "player-2", "a5f3", "zzz"]) {
      const baseline = assignCheckCard(id, "baseline");
      const post = assignCheckCard(id, "post");
      expect(baseline.pair).toBe(post.pair);
      expect(baseline.side).not.toBe(post.side);
      expect(assignCheckCard(id, "baseline").id).toBe(baseline.id);
      expect(getCheckCard(baseline.id)).toEqual(baseline);
    }
  });

  it("balances which side players see first", () => {
    const firsts = Array.from({ length: 400 }, (_, i) => assignCheckCard(`p-${i}`, "baseline").side);
    const a = firsts.filter((s) => s === "a").length;
    expect(a).toBeGreaterThan(140);
    expect(a).toBeLessThan(260);
  });
});

describe("discovery scorecard", () => {
  it("accepts valid patches and rejects bad values", () => {
    expect(scorecardPatchSchema.safeParse({ impact: 4, effort: 2, risks: ["money"], ai_kind: "extract" }).success).toBe(true);
    expect(scorecardPatchSchema.safeParse({ impact: 9 }).success).toBe(false);
    expect(scorecardPatchSchema.safeParse({ risks: ["vibes"] }).success).toBe(false);
  });

  it("counts the three Rank taps", () => {
    expect(scorecardProgress(EMPTY_SCORECARD)).toEqual({ done: 0, total: 3 });
    expect(scorecardProgress({ ...EMPTY_SCORECARD, impact: 3, readiness: "ready" }).done).toBe(2);
    expect(scorecardPatchSchema.safeParse({ readiness: "ready", risk_level: "high" }).success).toBe(true);
    expect(scorecardPatchSchema.safeParse({ readiness: "maybe" }).success).toBe(false);
  });

  it("suggests a kind of AI from the decision wording", () => {
    expect(suggestAiKind("If the refund is under ₦20,000, approve it")).toBe("rule");
    expect(suggestAiKind("AI reads the invoice and extracts the totals")).toBe("extract");
    expect(suggestAiKind("Classify the complaint by topic and urgency")).toBe("classify");
    expect(suggestAiKind("A WhatsApp bot answers staff questions")).toBe("assistant");
    expect(suggestAiKind("Forecast next month's demand")).toBe("forecast");
    expect(suggestAiKind("")).toBeNull();
  });

  it("puts use cases into portfolio buckets from value, readiness and risk", () => {
    expect(portfolioBucket({ impact: 5, readiness: "ready", risk_level: "low" })).toBe("quick_win");
    expect(portfolioBucket({ impact: 3, readiness: "ready", risk_level: "medium" })).toBe("quick_win");
    expect(portfolioBucket({ impact: 4, readiness: "ready", risk_level: "high" })).toBe("strategic_bet");
    expect(portfolioBucket({ impact: 4, readiness: "partly", risk_level: "low" })).toBe("strategic_bet");
    expect(portfolioBucket({ impact: 5, readiness: "not_yet", risk_level: "low" })).toBe("fix_data");
    expect(portfolioBucket({ impact: 2, readiness: "ready", risk_level: "low" })).toBe("park");
    expect(portfolioBucket({ impact: null, readiness: "ready", risk_level: "low" })).toBeNull();
    expect(portfolioBucket({ impact: 4, readiness: null, risk_level: null })).toBeNull();
  });

  it("still reads older sessions' long scorecard", () => {
    const base = { readiness: null, risk_level: null, data_location: "known", data_access: "yes", data_quality: "good" } as const;
    expect(portfolioBucket({ ...base, impact: 5, effort: 2 })).toBe("quick_win");
    expect(portfolioBucket({ ...base, impact: 4, effort: 5 })).toBe("strategic_bet");
    expect(portfolioBucket({ ...base, impact: 5, effort: 2, data_quality: "messy" })).toBe("fix_data");
  });
});
