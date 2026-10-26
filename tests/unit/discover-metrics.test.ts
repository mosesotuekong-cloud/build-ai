import { describe, expect, it } from "vitest";
import { pilotMetrics, type MetricDiscovery, type MetricEvent } from "@/lib/discover/metrics";

const d = (id: string, extra: Partial<MetricDiscovery> = {}): MetricDiscovery => ({ id, created_at: "2026-10-26T09:00:00Z", function_slug: "finance", title: `Discovery ${id}`, feedback: null, ...extra });
const e = (discovery_id: string, kind: string, data: Record<string, unknown> = {}, created_at = "2026-10-26T09:10:00Z"): MetricEvent => ({ discovery_id, kind, data, created_at });

describe("pilot metrics", () => {
  const discoveries = [
    d("a", { feedback: { useful: 5, comment: "Saved us a week" } }),
    d("b", { feedback: { useful: 2, comment: "" }, function_slug: "hr" }),
    d("c"),
    d("x"),
  ];
  const events = [
    e("a", "challenge_chosen", { via: "own" }),
    e("a", "built", { seconds_since_start: 600, export_ok: true }, "2026-10-26T09:10:00Z"),
    e("a", "built", { seconds_since_start: 900, export_ok: false }, "2026-10-26T09:15:00Z"),
    e("a", "strengthened", { readiness: 60 }),
    e("a", "downloaded", { file: "pdf" }),
    e("a", "downloaded", { file: "pdf" }),
    e("b", "challenge_chosen", { via: "week" }),
    e("b", "built", { seconds_since_start: 1200, export_ok: true }),
    e("b", "downloaded", { file: "n8n" }),
    e("c", "challenge_chosen", { via: "week" }),
    e("other", "built", { seconds_since_start: 1, export_ok: true }),
  ];
  const m = pilotMetrics(discoveries, events);

  it("counts the funnel per discovery, ignoring events outside the period", () => {
    expect(m.funnel.map((f) => f.count)).toEqual([4, 3, 2, 1, 2]);
    expect(m.completionRate).toBe(0.5);
    expect(m.strengthenedRate).toBe(0.5);
  });
  it("times the first build, and checks the latest export", () => {
    expect(m.medianMinutesToOutput).toBe(15); // 10 and 20 minutes
    expect(m.exportValidRate).toBe(0.5); // a's latest build failed, b's passed
  });
  it("tallies downloads, routes and functions", () => {
    expect(m.downloads).toEqual([{ file: "pdf", count: 2 }, { file: "n8n", count: 1 }]);
    expect(m.routes).toEqual([{ via: "week", count: 2 }, { via: "own", count: 1 }]);
    expect(m.byFunction[0]).toEqual({ function_slug: "finance", started: 3, built: 1 });
  });
  it("summarises usefulness and keeps written comments", () => {
    expect(m.feedback).toMatchObject({ responses: 2, average: 3.5, distribution: [0, 1, 0, 0, 1], usefulRate: 0.5 });
    expect(m.comments).toEqual([expect.objectContaining({ comment: "Saved us a week", useful: 5 })]);
  });
  it("copes with no data", () => {
    const empty = pilotMetrics([], []);
    expect(empty.completionRate).toBeNull();
    expect(empty.medianMinutesToOutput).toBeNull();
    expect(empty.feedback.average).toBeNull();
  });
});
