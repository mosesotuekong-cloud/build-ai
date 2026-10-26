import type { Discovery } from "./model";

// The discovery score: points and badges for the quality of thinking, never
// for speed (agreed 2026-10-06: "never reward speed"). Worked out from what
// the team has written and chosen, so it is the same on every screen.

export type ScoreInput = {
  fix: { eliminate: string; combine: string; simplify: string };
  trigger: string;
  steps: string;
  decision: string;
  action: string;
  human: string;
  oversight: string | null;
  systems: string[];
  rank: { value: number | null; effort: string | null; readiness: string | null; risk: string | null; reversibility: string | null };
  nudges: number;
  twistAnswered: boolean;
  questionsAnswered: number;
  businessEdited: boolean;
  downloaded: boolean;
};

export type Badge = { key: string; title: string; blurb: string; icon: string; points: number; earned: boolean };

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const detailed = (s: string) => words(s) >= 8;

export const LEVELS = [
  { min: 0, title: "Explorer" },
  { min: 60, title: "Designer" },
  { min: 120, title: "Architect" },
  { min: 170, title: "Builder" },
] as const;

export function discoveryScore(i: ScoreInput): { points: number; max: number; level: string; next: { title: string; min: number } | null; badges: Badge[] } {
  const fixCount = [i.fix.eliminate, i.fix.combine, i.fix.simplify].filter((s) => s.trim()).length;
  const designDetailed = [i.trigger, i.steps, i.decision, i.action].filter(detailed).length;
  const rankAnswered = Object.values(i.rank).filter((v) => v !== null).length;
  const badges: Badge[] = [
    { key: "waste", icon: "🧹", title: "Waste hunter", blurb: "Said what to stop, merge and simplify before automating.", points: 25, earned: fixCount === 3 },
    { key: "designer", icon: "🧩", title: "Clear designer", blurb: "Gave real detail on all four design cards.", points: 40, earned: designDetailed === 4 },
    { key: "connector", icon: "🔌", title: "Connector", blurb: "Named at least two systems the data lives in.", points: 15, earned: i.systems.length >= 2 },
    { key: "decision", icon: "⚖️", title: "Decision maker", blurb: "Said whether a rule or AI makes the call.", points: 15, earned: /\b(rule|if|when|ai|classif|score|match|threshold|over|under)\b/i.test(i.decision) },
    { key: "safety", icon: "🛡️", title: "Safety first", blurb: "Chose a control level and said who checks.", points: 20, earned: Boolean(i.oversight) && words(i.human) >= 4 },
    { key: "honest", icon: "🎯", title: "Straight talker", blurb: "Answered every Worth it? question.", points: 15, earned: rankAnswered === 5 },
    { key: "curious", icon: "💬", title: "Curious", blurb: "Asked the coach for a question.", points: 5, earned: i.nudges > 0 },
    { key: "twist", icon: "🌪️", title: "Twist survivor", blurb: "Stress-tested the design with a twist.", points: 20, earned: i.twistAnswered },
    { key: "evidence", icon: "🔍", title: "Evidence seeker", blurb: "Answered the AI's follow-up questions.", points: 25, earned: i.questionsAnswered >= 4 },
    { key: "numbers", icon: "🧮", title: "Numbers person", blurb: "Checked and saved the business case figures.", points: 10, earned: i.businessEdited },
    { key: "builder", icon: "🛠️", title: "Ready to build", blurb: "Took the files away to build.", points: 10, earned: i.downloaded },
  ];
  // A few points along the way too, so the score moves card by card.
  const partial = fixCount * 3 + designDetailed * 5 + (i.oversight ? 5 : 0) + rankAnswered * 2;
  const points = Math.min(200, partial + badges.filter((b) => b.earned).reduce((n, b) => n + b.points, 0));
  const max = 200;
  const level = [...LEVELS].reverse().find((l) => points >= l.min)!.title;
  const next = LEVELS.find((l) => l.min > points) ?? null;
  return { points, max, level, next, badges };
}

// The score for a saved discovery.
export function scoreOf(d: Discovery, live?: Partial<ScoreInput>) {
  return discoveryScore({
    fix: d.design.fix,
    trigger: d.design.trigger,
    steps: d.design.steps,
    decision: d.design.decision,
    action: d.design.action,
    human: d.design.human,
    oversight: d.design.oversight,
    systems: d.design.systems,
    rank: d.rank,
    nudges: d.game.nudges,
    twistAnswered: Boolean(d.game.twist?.response.trim()),
    questionsAnswered: Object.values(d.answers ?? {}).filter((a) => a.trim()).length,
    businessEdited: d.business?.source === "edited",
    downloaded: d.game.downloaded,
    ...live,
  });
}
