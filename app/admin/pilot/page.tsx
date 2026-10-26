import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { functionLabel } from "@/lib/discover/model";
import { pilotMetrics, type MetricDiscovery, type MetricEvent } from "@/lib/discover/metrics";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Pilot metrics" };

const PERIODS = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
  { key: "all", label: "All time" },
] as const;
// The start of the chosen period, or null for all time.
function sinceFor(period: string): string | null {
  return period === "all" ? null : new Date(Date.now() - Number(period) * 86_400_000).toISOString();
}
const pct = (r: number | null) => (r === null ? "–" : `${Math.round(r * 100)}%`);
const FILE_LABELS: Record<string, string> = { pdf: "Workflow PDF", n8n: "n8n JSON", "mcp-workflow": "MCP: workflow as tool", "mcp-server": "MCP: n8n server", "mcp-tool": "MCP: tool definition", guide: "Build guides" };
const ROUTE_LABELS: Record<string, string> = { own: "Wrote their own", ai: "AI suggestions", week: "Started from their week" };
const SCALE = ["Not at all", "A little", "Somewhat", "Very", "Extremely"];

// Phase 1: are people finishing discoveries, how fast do they get a useful
// output, are the exports valid, and did they find it useful? The layout's
// super-admin check guards this page.
export default async function PilotPage({ searchParams }: PageProps<"/admin/pilot">) {
  const sp = await searchParams;
  const period = PERIODS.find((p) => p.key === sp.period)?.key ?? "30";
  const since = sinceFor(period);
  const admin = createAdminClient();

  let dq = admin.from("discoveries").select("id, created_at, function_slug, challenge, feedback, game").order("created_at", { ascending: false }).limit(5000);
  if (since) dq = dq.gte("created_at", since);
  const { data: rows } = await dq;
  // Worked-example runs (demo mode) are demos, not pilots.
  const discoveries: MetricDiscovery[] = (rows ?? []).filter((r) => (r.game as { demo?: boolean } | null)?.demo !== true).map((r) => ({
    id: r.id,
    created_at: r.created_at,
    function_slug: r.function_slug,
    title: ((r.challenge as { title?: string } | null)?.title ?? null) as string | null,
    feedback: (r.feedback as MetricDiscovery["feedback"]) ?? null,
  }));
  const ids = discoveries.map((d) => d.id);
  const events: MetricEvent[] = [];
  for (let i = 0; i < ids.length; i += 500) {
    const { data } = await admin.from("discovery_events").select("discovery_id, kind, data, created_at").in("discovery_id", ids.slice(i, i + 500));
    events.push(...((data ?? []) as MetricEvent[]));
  }
  const m = pilotMetrics(discoveries, events);
  const top = Math.max(1, m.funnel[0].count);

  const stats = [
    { label: "Discoveries started", value: String(m.started), note: "" },
    { label: "Completion rate", value: pct(m.completionRate), note: "built a workflow" },
    { label: "Time to first output", value: m.medianMinutesToOutput === null ? "–" : `${Math.round(m.medianMinutesToOutput)} min`, note: "median, start to workflow" },
    { label: "Exports valid", value: pct(m.exportValidRate), note: "pass checks and compile" },
    { label: "Found it useful", value: pct(m.feedback.usefulRate), note: `${m.feedback.responses} answers, Very or Extremely` },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Pilot metrics</h1>
          <p className="text-ink-500">Phase 1: do teams finish a discovery, quickly, with outputs that work and help?</p>
        </div>
        <nav className="flex gap-1 rounded-xl bg-cream-200 p-1" aria-label="Period">
          {PERIODS.map((p) => (
            <Link key={p.key} href={`/admin/pilot?period=${p.key}`} aria-current={p.key === period ? "page" : undefined} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${p.key === period ? "bg-white shadow-card" : "text-ink-700"}`}>
              {p.label}
            </Link>
          ))}
        </nav>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="space-y-1 p-5">
            <dt className="text-sm text-ink-500">{s.label}</dt>
            <dd className="font-display text-3xl font-bold tabular-nums">{s.value}</dd>
            {s.note && <dd className="text-xs text-ink-500">{s.note}</dd>}
          </Card>
        ))}
      </dl>

      <section aria-labelledby="funnel-h" className="space-y-3">
        <h2 id="funnel-h" className="font-display text-2xl font-bold">
          Where people get to
        </h2>
        <ol className="space-y-2">
          {m.funnel.map((f) => (
            <li key={f.key} className="grid grid-cols-[11rem_1fr_4rem] items-center gap-3 text-sm">
              <span className="font-semibold">{f.label}</span>
              <span className="h-3 overflow-hidden rounded-full bg-cream-200">
                <span className="block h-full rounded-full bg-green-700" style={{ width: `${(f.count / top) * 100}%` }} />
              </span>
              <span className="text-right tabular-nums">{f.count}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-2 p-5">
          <h2 className="font-display text-xl font-bold">How they chose a challenge</h2>
          {m.routes.length ? (
            <ul className="space-y-1 text-sm">
              {m.routes.map((r) => (
                <li key={r.via} className="flex justify-between">
                  <span>{ROUTE_LABELS[r.via] ?? r.via}</span>
                  <span className="tabular-nums">{r.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-500">No data yet.</p>
          )}
        </Card>
        <Card className="space-y-2 p-5">
          <h2 className="font-display text-xl font-bold">Downloads</h2>
          {m.downloads.length ? (
            <ul className="space-y-1 text-sm">
              {m.downloads.map((d) => (
                <li key={d.file} className="flex justify-between">
                  <span>{FILE_LABELS[d.file] ?? d.file}</span>
                  <span className="tabular-nums">{d.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-500">No downloads yet.</p>
          )}
        </Card>
        <Card className="space-y-2 p-5">
          <h2 className="font-display text-xl font-bold">Was it useful?</h2>
          {m.feedback.responses ? (
            <>
              <p className="text-sm text-ink-500">Average {m.feedback.average!.toFixed(1)} out of 5</p>
              <ul className="space-y-1 text-sm">
                {SCALE.map((label, i) => (
                  <li key={label} className="flex justify-between">
                    <span>{label}</span>
                    <span className="tabular-nums">{m.feedback.distribution[i]}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-ink-500">No answers yet.</p>
          )}
        </Card>
      </div>

      <section aria-labelledby="fn-h" className="space-y-3">
        <h2 id="fn-h" className="font-display text-2xl font-bold">
          By function
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-cream-300 bg-cream-50">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-cream-300 text-ink-500">
              <tr>
                <th className="px-4 py-2 font-semibold">Function</th>
                <th className="px-4 py-2 text-right font-semibold">Started</th>
                <th className="px-4 py-2 text-right font-semibold">Built</th>
                <th className="px-4 py-2 text-right font-semibold">Completion</th>
              </tr>
            </thead>
            <tbody>
              {m.byFunction.map((f) => (
                <tr key={f.function_slug} className="border-t border-cream-200">
                  <td className="px-4 py-2 font-semibold">{functionLabel(f.function_slug)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{f.started}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{f.built}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{pct(f.started ? f.built / f.started : null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="cm-h" className="space-y-3">
        <h2 id="cm-h" className="font-display text-2xl font-bold">
          What people said
        </h2>
        {m.comments.length ? (
          <ul className="space-y-2">
            {m.comments.map((c, i) => (
              <li key={i} className="rounded-2xl border border-cream-300 bg-cream-50 p-4">
                <p className="text-sm text-ink-500">
                  {c.title} · {SCALE[c.useful - 1]}
                </p>
                <p className="mt-1">{c.comment}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-cream-200/60 p-4 text-ink-700">No comments yet.</p>
        )}
      </section>
    </div>
  );
}
