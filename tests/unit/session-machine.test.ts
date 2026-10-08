import { describe, expect, it } from "vitest";
import { canTransition, nextPhase, PHASES, phaseDurationSeconds, type Phase } from "@/lib/session/machine";
import { readSettings, sessionSettingsSchema } from "@/lib/session/settings";

const ALL = { before_after_check: true, twist_enabled: true };
const NO_CHECKS = { before_after_check: false, twist_enabled: true };
const NO_TWIST = { before_after_check: true, twist_enabled: false };
const BARE = { before_after_check: false, twist_enabled: false };

// The full set of allowed forward moves for each combination of settings.
// Everything else (except ending early) must be refused.
const ALLOWED: Record<string, [Phase, Phase][]> = {
  all: [
    ["draft", "lobby"],
    ["lobby", "baseline_check"],
    ["baseline_check", "solving"],
    ["solving", "twist"],
    ["twist", "solving_after_twist"],
    ["solving_after_twist", "prioritise"],
    ["prioritise", "judging"],
    ["judging", "reveal"],
    ["reveal", "post_check"],
    ["post_check", "commitments"],
    ["commitments", "report"],
    ["report", "closed"],
  ],
  noChecks: [
    ["draft", "lobby"],
    ["lobby", "solving"],
    ["solving", "twist"],
    ["twist", "solving_after_twist"],
    ["solving_after_twist", "prioritise"],
    ["prioritise", "judging"],
    ["judging", "reveal"],
    ["reveal", "commitments"],
    ["commitments", "report"],
    ["report", "closed"],
  ],
  noTwist: [
    ["draft", "lobby"],
    ["lobby", "baseline_check"],
    ["baseline_check", "solving"],
    ["solving", "prioritise"],
    ["prioritise", "judging"],
    ["judging", "reveal"],
    ["reveal", "post_check"],
    ["post_check", "commitments"],
    ["commitments", "report"],
    ["report", "closed"],
  ],
  bare: [
    ["draft", "lobby"],
    ["lobby", "solving"],
    ["solving", "prioritise"],
    ["prioritise", "judging"],
    ["judging", "reveal"],
    ["reveal", "commitments"],
    ["commitments", "report"],
    ["report", "closed"],
  ],
};

// Leaving an optional phase is always allowed, even when the setting is off,
// so a room never gets stuck if a facilitator changes settings mid-session.
// Entering a switched-off phase is not.
const EXITS: Record<string, [Phase, Phase][]> = {
  all: [],
  noChecks: [
    ["baseline_check", "solving"],
    ["post_check", "commitments"],
  ],
  noTwist: [
    ["twist", "solving_after_twist"],
    ["solving_after_twist", "prioritise"],
  ],
  bare: [
    ["baseline_check", "solving"],
    ["post_check", "commitments"],
    ["twist", "solving_after_twist"],
    ["solving_after_twist", "prioritise"],
  ],
};

const CASES = [
  ["all", ALL],
  ["noChecks", NO_CHECKS],
  ["noTwist", NO_TWIST],
  ["bare", BARE],
] as const;

describe("live session transitions", () => {
  for (const [name, settings] of CASES) {
    describe(`settings: ${name}`, () => {
      const allowed = new Set([...ALLOWED[name], ...EXITS[name]].map(([a, b]) => `${a}>${b}`));
      for (const from of PHASES) {
        for (const to of PHASES) {
          const endingEarly = to === "closed" && from !== "closed" && from !== "draft";
          const expected = allowed.has(`${from}>${to}`) || endingEarly;
          it(`${from} → ${to} is ${expected ? "allowed" : "refused"}`, () => {
            expect(canTransition(from, to, settings)).toBe(expected);
          });
        }
      }

      it("walks from draft to closed by always taking the next phase", () => {
        const path: Phase[] = ["draft"];
        let phase: Phase | null = "draft";
        while ((phase = nextPhase(phase, settings))) path.push(phase);
        expect(path.at(-1)).toBe("closed");
        expect(path.length).toBe(ALLOWED[name].length + 1);
      });
    });
  }

  it("skips the optional check phases when the check is off", () => {
    expect(canTransition("lobby", "baseline_check", NO_CHECKS)).toBe(false);
    expect(canTransition("reveal", "post_check", NO_CHECKS)).toBe(false);
    expect(canTransition("lobby", "solving", ALL)).toBe(false);
    expect(canTransition("reveal", "commitments", ALL)).toBe(false);
  });

  it("never goes backwards or skips ahead", () => {
    expect(canTransition("solving", "lobby", ALL)).toBe(false);
    expect(canTransition("solving", "judging", ALL)).toBe(false);
    expect(canTransition("closed", "lobby", ALL)).toBe(false);
  });

  it("does not let a draft be 'ended'; drafts are deleted instead", () => {
    expect(canTransition("draft", "closed", ALL)).toBe(false);
  });
});

describe("practice run transitions", () => {
  it("allows finishing, reopening and closing only", () => {
    for (const from of PHASES) {
      for (const to of PHASES) {
        const expected = (from === "solving" && to === "reveal") || (from === "reveal" && to === "solving") || (to === "closed" && from !== "closed");
        expect(canTransition(from, to, ALL, "practice"), `${from} → ${to}`).toBe(expected);
      }
    }
  });
});

describe("session settings", () => {
  it("fills in every default from an empty object", () => {
    const s = sessionSettingsSchema.parse({});
    expect(s).toMatchObject({ hint_tokens: 3, twist_bonus_tokens: 1, earn_back_cap: 3, before_after_check: true, case_mode: "teams_pick", function_mode: "whole_pile" });
    expect(s.minutes.solving).toBe(20);
  });

  it("falls back to defaults for junk", () => {
    expect(readSettings({ hint_tokens: "lots" }).hint_tokens).toBe(3);
    expect(readSettings(null).twist_enabled).toBe(true);
  });

  it("times only the timed phases", () => {
    const s = sessionSettingsSchema.parse({ minutes: { solving: 15 } });
    expect(phaseDurationSeconds("solving", s)).toBe(900);
    expect(phaseDurationSeconds("baseline_check", s)).toBe(240);
    expect(phaseDurationSeconds("lobby", s)).toBeNull();
    expect(phaseDurationSeconds("judging", s)).toBeNull();
  });
});
