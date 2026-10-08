"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Assessment } from "@/lib/ai/schemas/assessment";
import { RUBRIC } from "@/lib/ai/schemas/judge";
import { getPlatform } from "@/lib/config/platforms";
import { AI_KINDS, type Scorecard } from "@/lib/discovery/scorecard";
import type { Award } from "@/lib/judging/awards";
import type { TeamScore } from "@/lib/judging/load";
import { overrideScore, retryJudging } from "@/app/console/sessions/actions";

export type CheckSummary = { kind: "baseline" | "post"; count: number; average: number | null; criteria: Record<string, number> };
export type CommitmentRow = { teamName: string; owner_name: string; first_step: string; due_date: string; hasEmail: boolean };

const kindLabel = (v: string | null | undefined) => AI_KINDS.find((k) => k.value === v)?.label ?? "Not given";

// What the team said about data readiness, in the AI's three-step scale.
function teamReadiness(s: Scorecard): "ready" | "partly" | "not_ready" | null {
  if (!s.data_access && !s.data_quality && !s.data_location) return null;
  if (s.data_access === "no" || s.data_location === "unsure") return "not_ready";
  if (s.data_access === "yes" && s.data_quality === "good" && s.data_location === "known") return "ready";
  return "partly";
}

// Where the team's own view and the AI's assessment disagree enough to talk about.
function disagreements(team: Scorecard | null, ai: Assessment | null): string[] {
  if (!team || !ai) return [];
  const out: string[] = [];
  if (team.impact !== null && Math.abs(team.impact - ai.impact) >= 2) out.push(`Impact: team ${team.impact}, AI ${ai.impact}`);
  if (team.effort !== null && Math.abs(team.effort - ai.effort) >= 2) out.push(`Effort: team ${team.effort}, AI ${ai.effort}`);
  const readiness = teamReadiness(team);
  if (readiness && readiness !== ai.data_readiness) out.push(`Data: team says ${readiness.replace("_", " ")}, AI says ${ai.data_readiness.replace("_", " ")}`);
  if (team.ai_kind && team.ai_kind !== ai.ai_kind) out.push(`Kind of AI: team ${kindLabel(team.ai_kind)}, AI ${kindLabel(ai.ai_kind)}`);
  return out;
}

export function ResultsPanel({
  sessionId,
  scores,
  scorecards,
  awards,
  pending,
  failed,
  checks,
  commitments,
}: {
  sessionId: string;
  scores: TeamScore[];
  scorecards: Record<string, Scorecard | null>;
  awards: Award[];
  pending: number;
  failed: number;
  checks: CheckSummary[];
  commitments: CommitmentRow[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const judged = scores.filter((s) => s.status === "done").length;
  const ordered = [...scores].sort((a, b) => b.final - a.final);
  const baseline = checks.find((c) => c.kind === "baseline");
  const post = checks.find((c) => c.kind === "post");

  return (
    <section className="space-y-6" aria-label="Results">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold">Scores</h2>
            <p className="text-sm text-ink-500" role="status">
              {pending ? `Judging… ${judged} of ${scores.length} done` : `${judged} of ${scores.length} teams judged`}
              {failed ? ` · ${failed} couldn't be judged` : ""}
            </p>
          </div>
          {failed > 0 && (
            <Button variant="secondary" disabled={busy} onClick={() => start(() => retryJudging(sessionId))}>
              Try judging again
            </Button>
          )}
        </div>

        <ol className="space-y-2">
          {ordered.map((s, i) => {
            const diffs = disagreements(scorecards[s.id] ?? null, s.assessment);
            return (
              <li key={s.id} className="rounded-2xl border border-cream-300 bg-white p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="w-6 font-display text-lg font-bold text-ink-500">{i + 1}</span>
                  <button type="button" className="flex-1 text-left font-display text-lg font-bold" onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id}>
                    {s.name}
                  </button>
                  {s.status === "pending" && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">Judging…</span>}
                  {s.status === "failed" && <span className="rounded-full bg-danger-50 px-2.5 py-0.5 text-xs font-bold text-danger-700">Not judged</span>}
                  {diffs.length > 0 && <span className="rounded-full bg-cream-200 px-2.5 py-0.5 text-xs font-bold text-ink-700">{diffs.length} disagreements</span>}
                  <span className="text-sm text-ink-500">AI {s.total ?? "–"}</span>
                  <OverrideInput key={`${s.id}-${s.override}`} value={s.override} onSave={(v) => start(() => overrideScore(sessionId, s.id, v))} label={`Override for ${s.name}`} />
                  <span className="w-12 text-right font-display text-2xl font-bold text-green-700" aria-label={`Final score for ${s.name}`}>
                    {s.status === "done" || s.override !== null ? s.final : "–"}
                  </span>
                </div>

                {open === s.id && (
                  <div className="mt-3 grid gap-4 border-t border-cream-200 pt-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm text-ink-700">{s.summary}</p>
                      <ul className="space-y-1 text-sm">
                        {RUBRIC.map((r) => {
                          const c = s.breakdown.find((b) => b.key === r.key);
                          return (
                            <li key={r.key} className="flex justify-between gap-2">
                              <span className="text-ink-500">{r.label}</span>
                              <span className="font-semibold">{c ? `${c.score}/${r.max}` : "–"}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="font-display text-base font-bold">AI discovery assessment</p>
                      {s.assessment ? (
                        <>
                          <p className="text-ink-700">{s.assessment.note}</p>
                          <p className="text-ink-500">
                            Impact {s.assessment.impact}/5 · Effort {s.assessment.effort}/5 · Data {s.assessment.data_readiness.replace("_", " ")} · Risk {s.assessment.risk} ·{" "}
                            {kindLabel(s.assessment.ai_kind)}
                            {s.assessment.platform_fit ? ` · ${getPlatform(s.assessment.platform_fit)?.name}` : ""}
                          </p>
                          {diffs.length > 0 && (
                            <ul className="space-y-0.5 rounded-xl bg-amber-50 p-2 text-amber-700">
                              {diffs.map((d) => (
                                <li key={d}>{d}</li>
                              ))}
                            </ul>
                          )}
                        </>
                      ) : (
                        <p className="text-ink-500">Not assessed yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </Card>

      {awards.length > 0 && (
        <Card className="space-y-3">
          <h2 className="font-display text-2xl font-bold">Awards</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {awards.map((a) => (
              <li key={a.key} className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3">
                <p className="font-display font-bold">{a.title}</p>
                <p className="text-sm text-ink-700">{a.teamName}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {baseline && baseline.count > 0 && (
        <Card className="space-y-3">
          <h2 className="font-display text-2xl font-bold">What people learned</h2>
          <p className="text-ink-700">
            Warm-up average {baseline.average ?? "–"}
            {post && post.count > 0 ? ` → final round average ${post.average ?? "–"}` : " (the final round comes after the reveal)"}.
          </p>
          {post && post.count > 0 && (
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {["human", "decision", "trigger", "steps", "action"].map((key) => {
                const label = RUBRIC.find((r) => r.key === key)!.label;
                const before = baseline.criteria[key];
                const after = post.criteria[key];
                if (before === undefined || after === undefined) return null;
                const change = Math.round((after - before) * 10) / 10;
                return (
                  <li key={key} className="flex justify-between gap-2 rounded-lg bg-white px-3 py-1.5">
                    <span className="text-ink-700">{label}</span>
                    <span className={`font-semibold ${change > 0 ? "text-green-700" : change < 0 ? "text-danger-700" : "text-ink-500"}`}>
                      {change > 0 ? "+" : ""}
                      {change}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {commitments.length > 0 && (
        <Card className="space-y-3">
          <h2 className="font-display text-2xl font-bold">Commitments</h2>
          <ul className="space-y-2">
            {commitments.map((c) => (
              <li key={c.teamName} className="rounded-xl bg-white p-3">
                <p className="font-semibold">
                  {c.teamName}: {c.owner_name}
                  {c.hasEmail ? " (reminder set)" : ""}
                </p>
                <p className="text-sm text-ink-700">{c.first_step}</p>
                <p className="text-xs text-ink-500">By {new Date(c.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}

function OverrideInput({ value, onSave, label }: { value: number | null; onSave: (v: number | null) => void; label: string }) {
  const [text, setText] = useState(value === null ? "" : String(value));
  const commit = () => {
    const trimmed = text.trim();
    const next = trimmed === "" ? null : Math.max(0, Math.min(100, Math.round(Number(trimmed))));
    if (Number.isNaN(next)) return;
    if (next !== value) onSave(next);
  };
  return (
    <input
      aria-label={label}
      inputMode="numeric"
      placeholder="Override"
      value={text}
      onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
      className="w-20 rounded-lg border border-cream-300 px-2 py-1 text-sm"
    />
  );
}
