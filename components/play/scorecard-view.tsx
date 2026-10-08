"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PhaseTimer } from "@/components/session/phase-timer";
import { Wordmark } from "@/components/ui/wordmark";
import { saveScorecard } from "@/app/play/discovery-actions";
import { CANVAS_SLOTS, SLOT_LABELS } from "@/lib/ai/schemas/canvas";
import type { CoachDesign } from "@/lib/coach/context";
import { getPlatform } from "@/lib/config/platforms";
import { AI_KINDS, DATA_QUESTIONS, FREQUENCIES, RISKS, scorecardProgress, suggestAiKind, type Scorecard } from "@/lib/discovery/scorecard";
import { ImpactEffortGrid } from "./impact-effort-grid";

// The prioritise round: the team rates its own use case for the business.
// Every answer saves as soon as it's tapped.
export function ScorecardView({
  teamId,
  teamName,
  caseTitle,
  design,
  initial,
  platforms,
  timer,
  extra,
}: {
  teamId: string;
  teamName: string;
  caseTitle: string;
  design: CoachDesign;
  initial: Scorecard;
  platforms: string[];
  timer: { startedAt: string | null; duration: number | null; serverNow: string };
  extra?: React.ReactNode;
}) {
  // Suggest a kind of AI from the Decision slot when the team hasn't picked one.
  const [card, setCard] = useState<Scorecard>(() => ({ ...initial, ai_kind: initial.ai_kind ?? suggestAiKind(design.decision) }));
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const pending = useRef<Partial<Scorecard>>(initial.ai_kind ? {} : { ai_kind: card.ai_kind });
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
    timerRef.current = setTimeout(flush, 500);
  };

  // Save the suggested kind of AI straight away, and anything left on leaving.
  useEffect(() => {
    timerRef.current = setTimeout(flush, 300);
    return () => void flush();
  }, [flush]);

  const progress = scorecardProgress(card);
  const stack = platforms.map((s) => getPlatform(s)).filter(Boolean);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-5 pb-28">
      <header className="flex items-center justify-between gap-3">
        <Wordmark size="sm" />
        <PhaseTimer startedAt={timer.startedAt} durationSeconds={timer.duration} serverNow={timer.serverNow} size="sm" />
      </header>

      <section className="space-y-2 rounded-3xl bg-green-600 p-5 text-cream-50 shadow-card">
        <p className="text-sm font-bold tracking-wider text-cream-100/80 uppercase">{teamName} · Prioritise</p>
        <h1 className="font-display text-3xl leading-tight font-bold">{design.name || caseTitle}</h1>
        <p className="text-cream-100/90">Rate your own use case for the business. There are no wrong answers, only honest ones.</p>
        <p className="text-sm font-semibold text-cream-100" role="status">
          {progress.done} of {progress.total} answered · {saveState === "saving" ? "Saving…" : saveState === "error" ? "Couldn't save" : "Saved"}
        </p>
      </section>

      <details className="rounded-2xl border border-cream-300 bg-cream-50 p-4">
        <summary className="cursor-pointer font-semibold text-ink-700">Your design, as a reminder</summary>
        <ol className="mt-3 space-y-1.5 text-sm">
          {CANVAS_SLOTS.map((slot) => (
            <li key={slot}>
              <span className="font-bold text-ink-700">{SLOT_LABELS[slot].title}:</span> <span className="text-ink-700">{design[slot] || "(empty)"}</span>
            </li>
          ))}
        </ol>
      </details>

      <Section title="Where does it sit?" hint="Drag your card. Up means more impact for the business; right means more effort to build.">
        <ImpactEffortGrid impact={card.impact} effort={card.effort} label={design.name || "Your idea"} onChange={(impact, effort) => set({ impact, effort })} />
      </Section>

      <Section title="How often does it happen?">
        <Choice options={FREQUENCIES} value={card.frequency} onChange={(frequency) => set({ frequency })} />
        <label className="mt-3 flex items-center gap-3 text-sm text-ink-700">
          Roughly how many times a month?
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={card.volume_per_month ?? ""}
            onChange={(e) => set({ volume_per_month: e.target.value === "" ? null : Math.max(0, Math.round(Number(e.target.value))) })}
            className="w-28 rounded-xl border border-cream-300 bg-white px-3 py-2 text-base outline-none focus:border-green-600"
          />
        </label>
      </Section>

      <Section title="Is the data ready?" hint="Four quick taps. 'Not sure' is a fine answer: it tells the business what to check.">
        <div className="space-y-4">
          {DATA_QUESTIONS.map((q) => (
            <div key={q.key} className="space-y-1.5">
              <p className="font-semibold text-ink-700">{q.question}</p>
              <Choice options={q.options} value={card[q.key]} onChange={(v) => set({ [q.key]: v } as Partial<Scorecard>)} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="What's at stake if it goes wrong?" hint="Tap all that apply.">
        <div className="flex flex-wrap gap-2">
          {RISKS.map((r) => {
            const on = card.risks.includes(r.value);
            return (
              <button
                key={r.value}
                type="button"
                aria-pressed={on}
                onClick={() => set({ risks: on ? card.risks.filter((x) => x !== r.value) : [...card.risks, r.value] })}
                className={`rounded-full border-2 px-4 py-2 text-sm font-bold ${on ? "border-amber-500 bg-amber-400 text-ink-900" : "border-cream-300 bg-cream-50 text-ink-700"}`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="What kind of AI does it need?" hint={card.ai_kind && !initial.ai_kind ? "We guessed from your Decision slot. Change it if we're wrong." : undefined}>
        <div className="grid gap-2 sm:grid-cols-2">
          {AI_KINDS.map((k) => {
            const on = card.ai_kind === k.value;
            return (
              <button
                key={k.value}
                type="button"
                aria-pressed={on}
                onClick={() => set({ ai_kind: k.value })}
                className={`rounded-xl border-2 px-3 py-2.5 text-left ${on ? "border-green-600 bg-green-600 text-cream-50" : "border-cream-300 bg-cream-50 text-ink-900"}`}
              >
                <span className="block font-bold">{k.label}</span>
                <span className={`block text-xs ${on ? "text-cream-100/90" : "text-ink-500"}`}>{k.hint}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {stack.length > 0 && (
        <Section title="Which of your tools fits best?">
          <Choice
            options={[...stack.map((p) => ({ value: p!.slug, label: p!.name })), { value: "not_sure", label: "Not sure" }]}
            value={card.platform_fit}
            onChange={(platform_fit) => set({ platform_fit })}
          />
        </Section>
      )}

      {extra}
    </main>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-cream-300 bg-cream-50 p-4 shadow-card">
      <div className="space-y-0.5">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        {hint && <p className="text-sm text-ink-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Choice({ options, value, onChange }: { options: readonly { value: string; label: string }[]; value: string | null; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors ${on ? "border-green-600 bg-green-600 text-cream-50" : "border-cream-300 bg-white text-ink-700 hover:border-green-400"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
