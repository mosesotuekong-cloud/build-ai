import type { Assessment } from "@/lib/ai/schemas/assessment";
import type { CheckKind } from "@/lib/ai/schemas/check";
import { CANVAS_SLOTS, SLOT_LABELS, type CanvasSlot } from "@/lib/ai/schemas/canvas";
import { RUBRIC, type ScoredCriterion } from "@/lib/ai/schemas/judge";
import type { CoachDesign } from "@/lib/coach/context";
import { getPlatform } from "@/lib/config/platforms";
import { AI_KINDS, bucketFrom, portfolioBucket, RISKS, type Bucket, type Scorecard } from "@/lib/discovery/scorecard";
import type { FixNotes } from "@/lib/ai/schemas/canvas";

// The opportunity map: a ranked automation backlog for the company, built in
// code from the session's data so every number in the report is traceable.
// The AI only writes the prose around it (see lib/report/prose.ts).

export const BUCKETS: { key: Bucket; title: string; blurb: string }[] = [
  { key: "quick_win", title: "Quick wins", blurb: "High value, low effort, and the data is ready. Start here." },
  { key: "strategic_bet", title: "Strategic bets", blurb: "High value, but it needs real work. Plan and fund these." },
  { key: "fix_data", title: "Fix the data first", blurb: "The value is there, the data isn't yet. Sort the data, then build." },
  { key: "park", title: "Park", blurb: "Not worth doing now. Revisit if things change." },
];
export const bucketTitle = (b: Bucket | null) => BUCKETS.find((x) => x.key === b)?.title ?? "Not rated yet";

export type Readiness = "ready" | "partly" | "not_ready";
export type RiskLevel = "low" | "medium" | "high";

export type ReportTeamInput = {
  id: string;
  name: string;
  players: number;
  case: { title: string; function_name: string; source: "deck" | "raised" } | null;
  design: (CoachDesign & Scorecard) | null;
  score: { final: number; breakdown: ScoredCriterion[] } | null;
  assessment: Assessment | null;
  commitment: { owner_name: string; first_step: string; due_date: string } | null;
  // Flags from the team's first design check (older sessions only).
  firstFlags: CheckKind[];
  coachQuestions: number;
  coachSlots: string[];
};

export type ReportInput = {
  session: { name: string; date: string; orgName: string; platforms: string[]; beforeAfter: boolean };
  teams: ReportTeamInput[];
  ideas: { title: string; what_happens: string; who_feels_it: string; frequency: string | null; status: "raised" | "designed" }[];
  checks: { playerId: string; kind: "baseline" | "post"; total: number | null; breakdown: ScoredCriterion[] | null }[];
};

export type UseCase = {
  ref: string;
  teamId: string;
  teamName: string;
  title: string;
  functionName: string;
  source: "deck" | "raised";
  designName: string;
  slots: Record<CanvasSlot, string>;
  hoursPerMonth: number | null;
  rubricScore: number | null;
  aiKind: string | null;
  aiKindLabel: string | null;
  risk: RiskLevel;
  riskReasons: string[];
  platformFit: { slug: string; name: string } | null;
  needsIT: boolean;
  itReasons: string[];
  team: { impact: number | null; bucket: Bucket | null; readiness: Readiness | null; risk: RiskLevel | null };
  oversight: string | null;
  fix: FixNotes | null;
  ai: { impact: number; effort: number; bucket: Bucket; readiness: Readiness; risk: RiskLevel; note: string } | null;
  bucket: Bucket | null;
  disagreements: string[];
  owner: string | null;
  priority: number;
};

export type BeforeAfter = {
  players: number;
  before: number;
  after: number;
  change: number;
  improved: number;
  criteria: { key: string; label: string; before: number; after: number; change: number }[];
};

export type LearningFact = { key: string; count: number; of: number; text: string };

export type OpportunityMap = {
  version: 1;
  session: ReportInput["session"] & { platformNames: string[] };
  totals: { teams: number; players: number; useCases: number; hoursPerMonth: number; raised: number; commitments: number } & Record<Bucket, number>;
  useCases: UseCase[];
  byPlatform: { slug: string; name: string; refs: string[] }[];
  raised: ReportInput["ideas"];
  commitments: { ref: string; title: string; teamName: string; owner_name: string; first_step: string; due_date: string }[];
  beforeAfter: BeforeAfter | null;
  learning: LearningFact[];
};

const FLAG_TEXT: Record<CheckKind, string> = {
  no_human_control: "left out a human checkpoint until prompted",
  vague_trigger: "started with a trigger that read like a goal rather than an event",
  missing_data: "missed data their decision needed at first",
  wrong_rule_or_ai: "first reached for AI where a rule would do, or the other way round",
  hours_unbelievable: "gave an hours-saved figure that didn't add up at first",
  inaccessible_system: "relied on a system they may not be able to get into",
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const round = (x: number) => Math.round(x);

export function teamReadiness(s: Scorecard): Readiness | null {
  if (s.readiness) return s.readiness === "not_yet" ? "not_ready" : (s.readiness as Readiness);
  if (!s.data_location && !s.data_access && !s.data_quality) return null;
  if (s.data_access === "no" || s.data_quality === "messy") return "not_ready";
  if (s.data_location === "known" && s.data_access === "yes" && s.data_quality === "good") return "ready";
  return "partly";
}

// The AI's view goes through the same rule as the team's.
export function aiBucket(a: Pick<Assessment, "impact" | "data_readiness" | "risk">): Bucket {
  return bucketFrom(a.impact, a.data_readiness === "not_ready" ? "not_yet" : a.data_readiness, a.risk);
}

function teamRisk(level: string | null, risks: string[]): RiskLevel | null {
  if (level) return level as RiskLevel;
  if (risks.length === 0) return null;
  if (risks.length >= 2 || risks.some((r) => ["money", "pay", "people_decisions", "health_safety", "legal"].includes(r))) return "high";
  return "medium";
}

const kindLabel = (k: string | null) => AI_KINDS.find((x) => x.value === k)?.label ?? null;
const riskLabel = (r: string) => RISKS.find((x) => x.value === r)?.label ?? r;

function useCaseFor(team: ReportTeamInput, index: number): UseCase | null {
  if (!team.case || !team.design) return null;
  const d = team.design;
  const a = team.assessment;
  const readiness = teamReadiness(d);
  const tBucket = portfolioBucket(d);
  const aBucket = a ? aiBucket(a) : null;
  const tRisk = teamRisk(d.risk_level, d.risks);
  const levels = ["low", "medium", "high"] as const;
  // The more cautious of the two views.
  const risk: RiskLevel = levels[Math.max(levels.indexOf(a?.risk ?? "low"), levels.indexOf(tRisk ?? "low"))];

  const disagreements: string[] = [];
  if (tBucket && aBucket && tBucket !== aBucket) disagreements.push(`The team placed this in ${bucketTitle(tBucket)}; the AI would put it in ${bucketTitle(aBucket)}.`);
  if (a && d.impact !== null && Math.abs(a.impact - d.impact) >= 2) disagreements.push(`The team rated its value ${d.impact} of 5; the AI rated it ${a.impact}.`);
  if (a && readiness && readiness !== a.data_readiness) disagreements.push(`The team said it is ${readiness === "not_ready" ? "not ready" : readiness}; the AI thinks it is ${a.data_readiness === "not_ready" ? "not ready" : a.data_readiness}.`);
  if (a && tRisk && tRisk !== a.risk) disagreements.push(`The team rated the risk ${tRisk}; the AI rates it ${a.risk}.`);
  if (a && d.ai_kind && a.ai_kind !== d.ai_kind) disagreements.push(`The team saw this as "${kindLabel(d.ai_kind)}"; the AI sees "${kindLabel(a.ai_kind)}".`);

  const itReasons: string[] = [];
  if (d.readiness === "not_yet") itReasons.push("Data or access isn't ready yet");
  else if (d.readiness === "partly") itReasons.push("Some data or access gaps to close");
  else if (!d.readiness && d.data_access && d.data_access !== "yes") itReasons.push(d.data_access === "no" ? "No access to the data yet" : "Data access needs confirming");
  if (risk === "high" && d.oversight === "out") itReasons.push("Fully automatic on high-risk work: put a person in the loop first");
  if (d.personal_data === "yes" || d.personal_data === "unsure") itReasons.push("Personal data: check with data protection first");
  if (d.systems.length) itReasons.push(`Connects to ${d.systems.join(", ")}`);
  if (risk === "high") itReasons.push("High risk: needs sign-off before it goes live");

  const fitSlug = a?.platform_fit ?? d.platform_fit;
  const fit = fitSlug ? getPlatform(fitSlug) : undefined;
  const impact = avg([d.impact, a?.impact].filter((x): x is number => typeof x === "number"));
  const ready = (a?.data_readiness ?? readiness) === "ready" ? 1 : (a?.data_readiness ?? readiness) === "not_ready" ? -1 : 0;
  const riskPenalty = risk === "high" ? 1 : risk === "medium" ? 0.5 : 0;
  const priority = Math.round((impact * 2 + ready - riskPenalty + Math.min((d.hours_saved_per_month ?? 0) / 20, 2)) * 10) / 10;

  return {
    ref: `UC${index + 1}`,
    teamId: team.id,
    teamName: team.name,
    title: team.case.title,
    functionName: team.case.function_name,
    source: team.case.source,
    designName: d.name || team.case.title,
    slots: Object.fromEntries(CANVAS_SLOTS.map((s) => [s, d[s]])) as Record<CanvasSlot, string>,
    hoursPerMonth: d.hours_saved_per_month,
    rubricScore: team.score?.final ?? null,
    aiKind: a?.ai_kind ?? d.ai_kind,
    aiKindLabel: kindLabel(a?.ai_kind ?? d.ai_kind),
    risk,
    riskReasons: d.risks.map(riskLabel),
    platformFit: fit ? { slug: fit.slug, name: fit.name } : null,
    needsIT: itReasons.length > 0,
    itReasons,
    team: { impact: d.impact, bucket: tBucket, readiness, risk: tRisk },
    oversight: d.oversight ?? null,
    fix: d.fix && (d.fix.eliminate || d.fix.combine || d.fix.simplify) ? d.fix : null,
    ai: a ? { impact: a.impact, effort: a.effort, bucket: aBucket!, readiness: a.data_readiness, risk: a.risk, note: a.note } : null,
    // The team's own placement leads; the AI's view fills in when the team didn't rate it.
    bucket: tBucket ?? aBucket,
    disagreements,
    owner: team.commitment?.owner_name ?? null,
    priority,
  };
}

const BUCKET_ORDER: (Bucket | null)[] = ["quick_win", "strategic_bet", "fix_data", "park", null];

export function beforeAfterFrom(checks: ReportInput["checks"]): BeforeAfter | null {
  const byPlayer = new Map<string, { baseline?: (typeof checks)[number]; post?: (typeof checks)[number] }>();
  for (const c of checks) {
    if (c.total === null) continue;
    byPlayer.set(c.playerId, { ...byPlayer.get(c.playerId), [c.kind]: c });
  }
  const pairs = [...byPlayer.values()].filter((p) => p.baseline && p.post);
  if (!pairs.length) return null;
  const before = avg(pairs.map((p) => p.baseline!.total!));
  const after = avg(pairs.map((p) => p.post!.total!));
  // Human control and rule versus AI first, as the brief asks.
  const order = ["human", "decision", "trigger", "steps", "action"];
  const criteria = order.map((key) => {
    const rubric = RUBRIC.find((r) => r.key === key)!;
    const pct = (b: ScoredCriterion[] | null) => {
      const c = b?.find((x) => x.key === key);
      return c ? (c.score / c.max) * 100 : null;
    };
    const b = pairs.map((p) => pct(p.baseline!.breakdown)).filter((x): x is number => x !== null);
    const a = pairs.map((p) => pct(p.post!.breakdown)).filter((x): x is number => x !== null);
    return { key, label: rubric.label, before: round(avg(b)), after: round(avg(a)), change: round(avg(a)) - round(avg(b)) };
  });
  return {
    players: pairs.length,
    before: round(before),
    after: round(after),
    change: round(after) - round(before),
    improved: pairs.filter((p) => p.post!.total! > p.baseline!.total!).length,
    criteria,
  };
}

export function learningFrom(teams: ReportTeamInput[]): LearningFact[] {
  const designed = teams.filter((t) => t.case && t.design);
  const n = designed.length;
  if (!n) return [];
  const facts: LearningFact[] = [];
  const teamsWord = (k: number) => `${k} of ${n} ${n === 1 ? "team" : "teams"}`;

  // Fix it first: how many teams found waste to remove before automating.
  const fixed = designed.filter((t) => t.design!.fix && (t.design!.fix.eliminate || t.design!.fix.combine || t.design!.fix.simplify)).length;
  if (designed.some((t) => t.design!.fix !== undefined)) {
    facts.push({ key: "fix", count: fixed, of: n, text: `${teamsWord(fixed)} found something to stop, merge or simplify before automating.` });
  }

  // Control: the level each team chose, and any high-risk work left fully automatic.
  const chose = designed.filter((t) => t.design!.oversight);
  if (chose.length) {
    const by = (o: string) => chose.filter((t) => t.design!.oversight === o).length;
    facts.push({
      key: "control",
      count: chose.length,
      of: n,
      text: `Control: ${by("in")} kept a person in the loop, ${by("on")} put a person on the loop, and ${by("out")} chose fully automatic.`,
    });
    const riskyAuto = chose.filter((t) => t.design!.oversight === "out" && (t.design!.risk_level === "high" || t.assessment?.risk === "high")).length;
    if (riskyAuto) facts.push({ key: "risky_auto", count: riskyAuto, of: n, text: `${teamsWord(riskyAuto)} left high-risk work fully automatic. Ask why before anything is built.` });
  }

  const counts = new Map<CheckKind, number>();
  for (const t of designed) for (const k of new Set(t.firstFlags)) counts.set(k, (counts.get(k) ?? 0) + 1);
  for (const [key, count] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    facts.push({ key, count, of: n, text: `${count} of ${n} ${n === 1 ? "team" : "teams"} ${FLAG_TEXT[key]}.` });
  }

  const scored = designed.filter((t) => t.score?.breakdown.length);
  if (scored.length) {
    const weakest = RUBRIC.filter((r) => r.key !== "hours")
      .map((r) => ({ r, pct: avg(scored.map((t) => { const c = t.score!.breakdown.find((x) => x.key === r.key); return c ? c.score / c.max : 0; })) }))
      .sort((a, b) => a.pct - b.pct)[0];
    facts.push({
      key: "weakest_criterion",
      count: round(weakest.pct * 100),
      of: 100,
      text: `The weakest area across teams was "${weakest.r.label.toLowerCase()}", at ${round(weakest.pct * 100)}% of the marks on average.`,
    });
  }

  const asked = designed.reduce((s, t) => s + t.coachQuestions, 0);
  if (asked) {
    const slotCounts = new Map<string, number>();
    for (const t of designed) for (const s of t.coachSlots) slotCounts.set(s, (slotCounts.get(s) ?? 0) + 1);
    const top = [...slotCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const slotName = top && top[0] in SLOT_LABELS ? SLOT_LABELS[top[0] as CanvasSlot].title.toLowerCase() : null;
    facts.push({
      key: "coach",
      count: asked,
      of: n,
      text: `Teams asked the coach ${asked} ${asked === 1 ? "time" : "times"}${slotName ? `, most often about ${top[0] === "human" ? "control" : `the ${slotName}`}` : ""}.`,
    });
  }
  return facts;
}

export function buildOpportunityMap(input: ReportInput): OpportunityMap {
  const useCases = input.teams
    .map((t, i) => useCaseFor(t, i))
    .filter((u): u is UseCase => u !== null)
    .sort((a, b) => BUCKET_ORDER.indexOf(a.bucket) - BUCKET_ORDER.indexOf(b.bucket) || b.priority - a.priority)
    .map((u, i) => ({ ...u, ref: `UC${i + 1}` }));
  const refByTeam = new Map(useCases.map((u) => [u.teamId, u]));

  const platforms = new Map<string, { slug: string; name: string; refs: string[] }>();
  for (const u of useCases) {
    if (!u.platformFit) continue;
    const entry = platforms.get(u.platformFit.slug) ?? { ...u.platformFit, refs: [] };
    entry.refs.push(u.ref);
    platforms.set(u.platformFit.slug, entry);
  }

  const commitments = input.teams
    .filter((t) => t.commitment && refByTeam.has(t.id))
    .map((t) => {
      const u = refByTeam.get(t.id)!;
      return { ref: u.ref, title: u.designName, teamName: t.name, ...t.commitment! };
    })
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const bucketCount = (b: Bucket) => useCases.filter((u) => u.bucket === b).length;
  return {
    version: 1,
    session: { ...input.session, platformNames: input.session.platforms.map((s) => getPlatform(s)?.name ?? s) },
    totals: {
      teams: input.teams.length,
      players: input.teams.reduce((s, t) => s + t.players, 0),
      useCases: useCases.length,
      hoursPerMonth: round(useCases.reduce((s, u) => s + (u.hoursPerMonth ?? 0), 0)),
      raised: input.ideas.filter((i) => i.status === "raised").length,
      commitments: commitments.length,
      quick_win: bucketCount("quick_win"),
      strategic_bet: bucketCount("strategic_bet"),
      fix_data: bucketCount("fix_data"),
      park: bucketCount("park"),
    },
    useCases,
    byPlatform: [...platforms.values()].sort((a, b) => b.refs.length - a.refs.length),
    raised: input.ideas.filter((i) => i.status === "raised"),
    commitments,
    beforeAfter: input.session.beforeAfter ? beforeAfterFrom(input.checks) : null,
    learning: learningFrom(input.teams),
  };
}
