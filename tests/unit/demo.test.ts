import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { aiForOrg } from "@/lib/ai/for-org";
import { getAIProvider } from "@/lib/ai";
import { readServerEnv } from "@/lib/config/env";
import { BOT_TEAMS, DEMO_STACK, VISITOR_TEAM } from "@/lib/demo/content";
import { DEMO_ROOM_SETTINGS } from "@/lib/demo/sandbox";
import { HR_DEFAULT_CASES } from "@/lib/decks/hr-default";
import { AI_KINDS, FREQUENCIES, RISKS, scorecardPatchSchema } from "@/lib/discovery/scorecard";
import { getPlatform } from "@/lib/config/platforms";
import { nextPhase } from "@/lib/session/machine";
import { readSettings, sessionSettingsSchema } from "@/lib/session/settings";

describe("demo content", () => {
  it("room settings parse exactly, with no warm-up round", () => {
    expect(sessionSettingsSchema.safeParse(DEMO_ROOM_SETTINGS).success).toBe(true);
    const settings = readSettings(DEMO_ROOM_SETTINGS);
    expect(settings.before_after_check).toBe(false);
    expect(settings.case_mode).toBe("facilitator_assigns");
    expect(settings.minutes.solving).toBe(5);
    expect(nextPhase("lobby", settings)).toBe("solving");
  });

  it("every team's case is in the HR deck and every scorecard value is valid", () => {
    const titles = HR_DEFAULT_CASES.map((c) => c.title);
    for (const team of [VISITOR_TEAM, ...BOT_TEAMS]) {
      expect(titles).toContain(team.caseTitle);
      const d = team.design;
      expect(scorecardPatchSchema.safeParse({ impact: d.impact, effort: d.effort, frequency: d.frequency, risks: d.risks, ai_kind: d.ai_kind }).success).toBe(true);
      if (d.frequency) expect(FREQUENCIES.map((f) => f.value)).toContain(d.frequency);
      if (d.ai_kind) expect(AI_KINDS.map((k) => k.value)).toContain(d.ai_kind);
      for (const r of d.risks) expect(RISKS.map((x) => x.value)).toContain(r);
    }
    expect(new Set(BOT_TEAMS.map((t) => t.caseTitle)).size).toBe(BOT_TEAMS.length);
  });

  it("the demo stack names real platforms", () => {
    for (const slug of DEMO_STACK) expect(getPlatform(slug)).toBeTruthy();
  });

  it("has safe defaults for the AI budget", () => {
    const env = readServerEnv({});
    expect(env).toMatchObject({ DEMO_ENABLED: true, DEMO_AI_UNITS: 40, DEMO_DAILY_AI_UNITS: 600, DEMO_STARTS_PER_IP_PER_DAY: 5 });
    expect(readServerEnv({ DEMO_ENABLED: "false" }).DEMO_ENABLED).toBe(false);
  });
});

describe("AI for an organisation", () => {
  // A stand-in for the admin client: just enough for aiForOrg.
  const fakeAdmin = (isDemo: boolean, rpc: { data: boolean | null; error: { message: string } | null }) => {
    const calls: unknown[] = [];
    const admin = {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { is_demo: isDemo } }) }) }) }),
      rpc: async (...args: unknown[]) => {
        calls.push(args);
        return rpc;
      },
    };
    return { admin: admin as never, calls };
  };

  it("real organisations use the normal provider and spend nothing", async () => {
    const { admin, calls } = fakeAdmin(false, { data: true, error: null });
    expect(await aiForOrg("org", 2, admin)).toBe(getAIProvider());
    expect(calls).toEqual([]);
  });

  it("demo sandboxes spend from their budget while it lasts", async () => {
    const { admin, calls } = fakeAdmin(true, { data: true, error: null });
    expect(await aiForOrg("org", 2, admin)).toBe(getAIProvider());
    expect(calls[0]).toEqual(["spend_demo_ai", { target_org: "org", amount: 2, daily_limit: 600 }]);
  });

  it("switch to scripted replies when the budget is spent or the check fails", async () => {
    const spent = await aiForOrg("org", 2, fakeAdmin(true, { data: false, error: null }).admin);
    expect(spent).not.toBe(getAIProvider());
    expect(spent.name).toBe("mock");
    const broken = await aiForOrg("org", 2, fakeAdmin(true, { data: null, error: { message: "boom" } }).admin);
    expect(broken.name).toBe("mock");
  });
});
