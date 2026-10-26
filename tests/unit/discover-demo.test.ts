import { describe, expect, it } from "vitest";
import { FOLLOW_UP_TOPICS } from "@/lib/ai/schemas/discovery";
import { businessCase, businessInputsSchema, paybackText } from "@/lib/discover/business";
import { DEMO_ANSWERS, DEMO_BUSINESS, DEMO_CHALLENGE, DEMO_DESIGN, DEMO_RANK, DEMO_SETUP } from "@/lib/discover/demo-scenario";
import { keywordCheck } from "@/lib/discover/ai-act";
import { challengeSchema, discoveryDesignSchema, rankSchema, setupSchema } from "@/lib/discover/model";
import { discoveryScore } from "@/lib/discover/score";
import { verdictFrom } from "@/lib/discover/verdict";

describe("the worked example", () => {
  it("passes every schema the app enforces", () => {
    expect(setupSchema.safeParse(DEMO_SETUP).success).toBe(true);
    expect(challengeSchema.safeParse(DEMO_CHALLENGE).success).toBe(true);
    expect(discoveryDesignSchema.safeParse(DEMO_DESIGN).success).toBe(true);
    expect(rankSchema.safeParse(DEMO_RANK).success).toBe(true);
    expect(businessInputsSchema.safeParse(DEMO_BUSINESS).success).toBe(true);
  });
  it("tells the demo script's story: Plan it, 8-month payback, minimal AI Act risk", () => {
    expect(verdictFrom({ ...DEMO_RANK, oversight: DEMO_DESIGN.oversight })).toBe("plan");
    expect(paybackText(businessCase(DEMO_BUSINESS).scenarios[1].paybackMonths)).toBe("8 months");
    expect(keywordCheck([DEMO_CHALLENGE.story, DEMO_DESIGN.decision, DEMO_DESIGN.action].join(" ")).category).toBe("minimal");
  });
  it("has a ready answer for every follow-up topic", () => {
    for (const topic of FOLLOW_UP_TOPICS) expect(DEMO_ANSWERS[topic], topic).toBeTruthy();
  });
  it("earns the card badges as it's clicked through", () => {
    const s = discoveryScore({ ...DEMO_DESIGN, rank: DEMO_RANK, nudges: 0, twistAnswered: false, questionsAnswered: 0, businessEdited: true, downloaded: false });
    const earned = s.badges.filter((b) => b.earned).map((b) => b.key);
    expect(earned).toEqual(expect.arrayContaining(["waste", "designer", "connector", "decision", "safety", "honest", "numbers"]));
  });
});
