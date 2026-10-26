// Phase 1 pilot metrics, worked out from discoveries and their events.
// Kept separate from the database so it can be tested on its own.

export type MetricDiscovery = { id: string; created_at: string; function_slug: string; title: string | null; feedback: { useful: number; comment: string } | null };
export type MetricEvent = { discovery_id: string; kind: string; data: Record<string, unknown>; created_at: string };

export type PilotMetrics = {
  started: number;
  funnel: { key: string; label: string; count: number }[];
  completionRate: number | null;
  medianMinutesToOutput: number | null;
  exportValidRate: number | null;
  strengthenedRate: number | null;
  downloads: { file: string; count: number }[];
  routes: { via: string; count: number }[];
  byFunction: { function_slug: string; started: number; built: number }[];
  feedback: { responses: number; average: number | null; distribution: number[]; usefulRate: number | null };
  comments: { title: string; useful: number; comment: string; at: string }[];
};

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const rate = (n: number, d: number) => (d ? n / d : null);

export function pilotMetrics(discoveries: MetricDiscovery[], events: MetricEvent[]): PilotMetrics {
  const ids = new Set(discoveries.map((d) => d.id));
  const mine = events.filter((e) => ids.has(e.discovery_id));
  const withKind = (kind: string) => new Set(mine.filter((e) => e.kind === kind).map((e) => e.discovery_id));

  const chose = withKind("challenge_chosen");
  const built = withKind("built");
  const strengthened = withKind("strengthened");
  const downloaded = withKind("downloaded");

  // Time to first useful output: the first build of each discovery.
  const firstBuild = new Map<string, MetricEvent>();
  for (const e of [...mine].filter((e) => e.kind === "built").sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (!firstBuild.has(e.discovery_id)) firstBuild.set(e.discovery_id, e);
  }
  const minutes = [...firstBuild.values()].map((e) => Number(e.data.seconds_since_start) / 60).filter((m) => Number.isFinite(m) && m >= 0);

  // Export validity: the latest build of each discovery.
  const lastBuild = new Map<string, MetricEvent>();
  for (const e of [...mine].filter((e) => e.kind === "built").sort((a, b) => a.created_at.localeCompare(b.created_at))) lastBuild.set(e.discovery_id, e);
  const valid = [...lastBuild.values()].filter((e) => e.data.export_ok === true).length;

  const count = <K extends string>(items: K[]) => {
    const m = new Map<K, number>();
    for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  const rated = discoveries.filter((d) => d.feedback);
  const distribution = [1, 2, 3, 4, 5].map((n) => rated.filter((d) => d.feedback!.useful === n).length);
  const functions = [...new Set(discoveries.map((d) => d.function_slug))];

  return {
    started: discoveries.length,
    funnel: [
      { key: "started", label: "Started", count: discoveries.length },
      { key: "chose", label: "Chose a challenge", count: chose.size },
      { key: "built", label: "Built a workflow", count: built.size },
      { key: "strengthened", label: "Made it stronger", count: strengthened.size },
      { key: "downloaded", label: "Downloaded something", count: downloaded.size },
    ],
    completionRate: rate(built.size, discoveries.length),
    medianMinutesToOutput: median(minutes),
    exportValidRate: rate(valid, lastBuild.size),
    strengthenedRate: rate(strengthened.size, built.size),
    downloads: count(mine.filter((e) => e.kind === "downloaded").map((e) => String(e.data.file))).map(([file, n]) => ({ file, count: n })),
    routes: count(mine.filter((e) => e.kind === "challenge_chosen").map((e) => String(e.data.via))).map(([via, n]) => ({ via, count: n })),
    byFunction: functions
      .map((f) => ({ function_slug: f, started: discoveries.filter((d) => d.function_slug === f).length, built: discoveries.filter((d) => d.function_slug === f && built.has(d.id)).length }))
      .sort((a, b) => b.started - a.started),
    feedback: {
      responses: rated.length,
      average: rated.length ? rated.reduce((n, d) => n + d.feedback!.useful, 0) / rated.length : null,
      distribution,
      usefulRate: rate(distribution[3] + distribution[4], rated.length),
    },
    comments: rated
      .filter((d) => d.feedback!.comment.trim())
      .map((d) => ({ title: d.title ?? "Untitled", useful: d.feedback!.useful, comment: d.feedback!.comment, at: d.created_at }))
      .slice(0, 30),
  };
}
