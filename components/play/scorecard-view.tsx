"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PhaseTimer } from "@/components/session/phase-timer";
import { Wordmark } from "@/components/ui/wordmark";
import { saveScorecard } from "@/app/play/discovery-actions";
import { CANVAS_SLOTS, oversightLabel, SLOT_LABELS } from "@/lib/ai/schemas/canvas";
import type { CoachDesign } from "@/lib/coach/context";
import { portfolioBucket, READINESS, RISK_LEVELS, scorecardProgress, VALUE_LABELS, type Scorecard } from "@/lib/discovery/scorecard";
import { BUCKETS } from "@/lib/report/map";

// Rank: three taps. Is it worth it (value), is it ready (readiness), and
// how bad if it goes wrong (risk)? The portfolio bucket appears as they
// answer. Every tap saves at once.
export function ScorecardView({
  teamId,
  teamName,
  caseTitle,
  design,
  initial,
  timer,
  extra,
}: {
  teamId: string;
  teamName: string;
  caseTitle: string;
  design: CoachDesign;
  initial: Scorecard;
  platforms?: string[];
  timer: { startedAt: string | null; duration: number | null; serverNow: string };
  extra?: React.ReactNode;
}) {
  const [card, setCard] = useState(initial);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const pending = useRef<Partial<Scorecard>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (!Object.keys(patch).length) return;
    setSaveState("saving");
    const result = await saveScorecard(teamId, patch as never);
    setSaveState(result.ok ? "saved" : "error");
  }, [teamId]);

  const set = (patch: Partial<Scorecard>) => {
    setCard((c) => ({ ...c, ...patch }));
    pending.current = { ...pending.current, ...patch };
    setSaveState("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, 400);
  };

  useEffect(() => () => void flush(), [flush]);

  const progress = scorecardProgress(card);
  const bucket = progress.done === progress.total ? portfolioBucket(card) : null;
  const bucketInfo = BUCKETS.find((b) => b.key === bucket);
  const control = oversightLabel(design.oversight);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 py-5 pb-28">
      <header className="flex items-center justify-between gap-3">
        <Wordmark size="sm" />
        <PhaseTimer startedAt={timer.startedAt} durationSeconds={timer.duration} serverNow={timer.serverNow} size="sm" />
      </header>

      <section className="space-y-2 rounded-3xl bg-green-600 p-5 text-cream-50 shadow-card">
        <p className="text-sm font-bold tracking-wider text-cream-100/80 uppercase">{teamName} · Rank</p>
        <h1 className="font-display text-3xl leading-tight font-bold">{design.name || caseTitle}</h1>
        <p className="text-cream-100/90">Three honest taps. The business uses them to decide what to build first.</p>
        <p className="text-sm font-semibold text-cream-100" role="status">
          {progress.done} of {progress.total} answered · {saveState === "saving" ? "Saving…" : saveState === "error" ? "Couldn't save" : "Saved"}
        </p>
      </section>

      <details className="rounded-2xl border border-cream-300 bg-cream-50 p-4">
        <summary className="cursor-pointer font-semibold text-ink-700">Your design, as a reminder</summary>
        <ol className="mt-3 space-y-1.5 text-sm">
          {CANVAS_SLOTS.map((slot) => (
            <li key={slot}>
              <span className="font-bold text-ink-700">{SLOT_LABELS[slot].title}:</span>{" "}
              <span className="text-ink-700">
                {slot === "human" && control ? `${control}. ` : ""}
                {design[slot] || (slot === "human" && control ? "" : "(empty)")}
              </span>
            </li>
          ))}
        </ol>
      </details>

      <Step n={1} title="Is it worth it?" hint="How much would it help the business?">
        <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Value">
          {VALUE_LABELS.map((label, i) => {
            const value = i + 1;
            const on = card.impact === value;
            return (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`Value ${value}: ${label}`}
                onClick={() => set({ impact: value })}
                className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-1 py-3 transition-colors ${on ? "border-green-600 bg-green-600 text-cream-50" : "border-cream-300 bg-white text-ink-900 hover:border-green-400"}`}
              >
                <span className="font-display text-2xl font-bold">{value}</span>
                <span className={`text-center text-xs leading-tight ${on ? "text-cream-100" : "text-ink-500"}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </Step>

      <Step n={2} title="Is it ready?" hint="Data, access and a clear process.">
        <Options options={READINESS} value={card.readiness} onChange={(readiness) => set({ readiness })} label="Readiness" />
      </Step>

      <Step n={3} title="What if it goes wrong?" hint="How bad, and how easy to undo?">
        <Options options={RISK_LEVELS} value={card.risk_level} onChange={(risk_level) => set({ risk_level })} label="Risk" amber />
      </Step>

      <AnimatePresence>
        {bucketInfo && (
          <motion.section
            key={bucketInfo.key}
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-1 rounded-3xl border-4 border-amber-400 bg-amber-50 p-5 text-center shadow-lift"
            role="status"
          >
            <p className="text-sm font-bold tracking-wider text-amber-700 uppercase">Your call</p>
            <p className="font-display text-3xl font-bold">{bucketInfo.title}</p>
            <p className="text-ink-700">{bucketInfo.blurb}</p>
            {card.risk_level === "high" && design.oversight === "out" && (
              <p className="pt-2 text-sm font-semibold text-danger-700">High risk with no person in the loop? Your facilitator and the judges will ask about that.</p>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {extra}
    </main>
  );
}

function Step({ n, title, hint, children }: { n: number; title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-cream-300 bg-cream-50 p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 font-display font-bold text-cream-50">{n}</span>
        <div>
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <p className="text-sm text-ink-500">{hint}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Options({
  options,
  value,
  onChange,
  label,
  amber = false,
}: {
  options: readonly { value: string; label: string; hint: string }[];
  value: string | null;
  onChange: (v: string) => void;
  label: string;
  amber?: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const on = value === o.value;
        const onStyle = amber ? "border-amber-500 bg-amber-400 text-ink-900" : "border-green-600 bg-green-600 text-cream-50";
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`rounded-2xl border-2 p-3 text-left transition-colors ${on ? onStyle : "border-cream-300 bg-white text-ink-900 hover:border-green-400"}`}
          >
            <span className="block text-lg font-bold">{o.label}</span>
            <span className={`block text-sm ${on && !amber ? "text-cream-100" : "text-ink-500"}`}>{o.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
