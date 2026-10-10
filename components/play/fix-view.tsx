"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PhaseTimer } from "@/components/session/phase-timer";
import { Wordmark } from "@/components/ui/wordmark";
import { saveFix } from "@/app/play/discovery-actions";
import { FIX_PROMPTS, type FixNotes } from "@/lib/ai/schemas/canvas";
import type { CoachCase } from "@/lib/coach/context";

// Fix it first (Lean ECRS): before anyone designs an automation, the team
// asks what they would stop, merge or simplify. Automating a wasteful
// process only makes the waste faster. Every answer saves as they type.
export function FixView({
  teamId,
  teamName,
  caseInfo,
  initial,
  timer,
  extra,
}: {
  teamId: string;
  teamName: string;
  caseInfo: CoachCase;
  initial: FixNotes;
  timer: { startedAt: string | null; duration: number | null; serverNow: string };
  extra?: React.ReactNode;
}) {
  const [notes, setNotes] = useState(initial);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const pending = useRef<Partial<FixNotes>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (!Object.keys(patch).length) return;
    setSaveState("saving");
    const result = await saveFix(teamId, patch);
    setSaveState(result.ok ? "saved" : "error");
  }, [teamId]);

  useEffect(() => () => void flush(), [flush]);

  const set = (key: keyof FixNotes, value: string) => {
    setNotes((n) => ({ ...n, [key]: value }));
    pending.current = { ...pending.current, [key]: value };
    setSaveState("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, 700);
  };

  const answered = FIX_PROMPTS.filter((p) => notes[p.key].trim()).length;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 py-5 pb-28">
      <header className="flex items-center justify-between gap-3">
        <Wordmark size="sm" />
        <PhaseTimer startedAt={timer.startedAt} durationSeconds={timer.duration} serverNow={timer.serverNow} size="sm" />
      </header>

      <section className="space-y-2 rounded-3xl bg-green-600 p-5 text-cream-50 shadow-card">
        <p className="text-sm font-bold tracking-wider text-cream-100/80 uppercase">{teamName} · Step 1 of 4: Fix it first</p>
        <h1 className="font-display text-3xl leading-tight font-bold">Don&apos;t automate the mess.</h1>
        <p className="text-cream-100/90">Before you design anything, look for work you could stop, merge or simplify. Automating waste only makes it faster.</p>
        <p className="text-sm font-semibold text-cream-100" role="status">
          {answered} of 3 answered · {saveState === "saving" ? "Saving…" : saveState === "error" ? "Couldn't save" : "Saved"}
        </p>
      </section>

      <section className="space-y-2 rounded-2xl border border-cream-300 bg-cream-50 p-4 shadow-card" aria-label="Your case">
        <p className="text-xs font-bold tracking-wider text-green-700 uppercase">Your case · {caseInfo.function_name}</p>
        <h2 className="font-display text-2xl font-bold">{caseInfo.title}</h2>
        <p className="leading-relaxed text-ink-700">{caseInfo.story}</p>
        {caseInfo.cost && <p className="font-semibold text-green-700">{caseInfo.cost}</p>}
      </section>

      {FIX_PROMPTS.map((prompt) => (
        <label key={prompt.key} className="block space-y-2 rounded-2xl border border-cream-300 bg-cream-50 p-4 shadow-card">
          <span className="flex items-center gap-2">
            <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold tracking-wide text-ink-900 uppercase">{prompt.label}</span>
            <span className="font-display text-lg font-bold">{prompt.question}</span>
          </span>
          <textarea
            value={notes[prompt.key]}
            onChange={(e) => set(prompt.key, e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Nothing comes to mind? Leave it blank."
            className="w-full resize-none rounded-xl border border-cream-300 bg-white px-3 py-2.5 text-base outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            aria-label={prompt.question}
          />
        </label>
      ))}

      <p className="text-center text-sm text-ink-500">Next: design the automation for what&apos;s left.</p>
      {extra}
    </main>
  );
}
