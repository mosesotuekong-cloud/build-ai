import type { ScoredCriterion } from "@/lib/ai/schemas/judge";

export type RankedTeam = { id: string; name: string; final: number; breakdown: ScoredCriterion[] };

export type Award = { key: string; title: string; reason: string; teamId: string; teamName: string };

const AWARD_DEFS = [
  { key: "human", criterion: "human", title: "Best human checkpoint", reason: "Put a person exactly where the risk is." },
  { key: "hours", criterion: "hours", title: "Most believable hours saved", reason: "Hours saved you'd sign off in a budget meeting." },
  { key: "trigger", criterion: "trigger", title: "Sharpest trigger", reason: "Started from a real, specific event." },
  { key: "decision", criterion: "decision", title: "Best rule-or-AI call", reason: "Used AI only where judgement was needed." },
] as const;

// The leaderboard, highest final score first. Ties keep the order teams joined.
export function rankTeams<T extends RankedTeam>(teams: T[]): T[] {
  return [...teams].sort((a, b) => b.final - a.final);
}

// Awards on top of the overall winner, so more teams get applause, and for
// the right things. A team wins at most one criterion award; ties go to the
// team with the higher overall score. Teams scoring zero on a criterion
// never win it.
export function computeAwards(teams: RankedTeam[]): Award[] {
  const ranked = rankTeams(teams).filter((t) => t.breakdown.length);
  if (!ranked.length) return [];
  const awards: Award[] = [{ key: "winner", title: "Top design", reason: "Highest score overall.", teamId: ranked[0].id, teamName: ranked[0].name }];
  const won = new Set<string>([ranked[0].id]);

  for (const def of AWARD_DEFS) {
    const score = (t: RankedTeam) => t.breakdown.find((c) => c.key === def.criterion)?.score ?? 0;
    const candidates = ranked.filter((t) => !won.has(t.id) && score(t) > 0);
    // When everyone has won something already, the best on the criterion can win again.
    const pool = candidates.length ? candidates : ranked.filter((t) => score(t) > 0);
    if (!pool.length) continue;
    const best = pool.reduce((a, b) => (score(b) > score(a) || (score(b) === score(a) && b.final > a.final) ? b : a));
    awards.push({ key: def.key, title: def.title, reason: def.reason, teamId: best.id, teamName: best.name });
    won.add(best.id);
  }
  return awards;
}
