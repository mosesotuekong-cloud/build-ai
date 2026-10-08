"use client";

import { useState, useTransition } from "react";
import { Stamp } from "@/components/game/stamp";
import { PhaseTimer } from "@/components/session/phase-timer";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";
import { saveCommitment } from "@/app/play/commitment-actions";

// The team's pledge: who owns the next step, what it is, and by when.
export function CommitmentsView({
  teamId,
  teamName,
  designName,
  initial,
  defaultOwner,
  timer,
}: {
  teamId: string;
  teamName: string;
  designName: string;
  initial: { owner_name: string; owner_email: string | null; first_step: string; due_date: string } | null;
  defaultOwner: string;
  timer: { startedAt: string | null; duration: number | null; serverNow: string };
}) {
  const today = new Date();
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  const [owner, setOwner] = useState(initial?.owner_name ?? defaultOwner);
  const [email, setEmail] = useState(initial?.owner_email ?? "");
  const [step, setStep] = useState(initial?.first_step ?? "");
  const [due, setDue] = useState(initial?.due_date ?? toIso(new Date(today.getTime() + 14 * 86_400_000)));
  const [signed, setSigned] = useState(Boolean(initial));
  const [celebrate, setCelebrate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const input = "w-full rounded-xl border border-cream-300 bg-white px-3 py-2.5 text-base outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100";

  return (
    <main className="mx-auto w-full max-w-xl flex-1 space-y-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <Wordmark size="sm" />
        <PhaseTimer startedAt={timer.startedAt} durationSeconds={timer.duration} serverNow={timer.serverNow} size="sm" />
      </header>
      <div className="space-y-1">
        <p className="text-sm font-bold tracking-wider text-green-700 uppercase">{teamName} · Commitments</p>
        <h1 className="font-display text-3xl font-bold">Make it real</h1>
        <p className="text-ink-700">Workshops fade by Monday. Name who takes &ldquo;{designName}&rdquo; forward, the very first step, and when.</p>
      </div>

      <form
        className="relative space-y-4 rounded-3xl border-2 border-cream-300 bg-cream-50 p-5 shadow-card"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            setError(null);
            const result = await saveCommitment(teamId, { owner_name: owner, owner_email: email, first_step: step, due_date: due });
            if (result.ok) {
              setSigned(true);
              setCelebrate(true);
              setTimeout(() => setCelebrate(false), 1800);
            }
            else setError(result.message ?? "That didn't work.");
          });
        }}
      >
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-ink-700">Who owns it?</span>
          <input className={input} value={owner} onChange={(e) => (setOwner(e.target.value), setSigned(false))} maxLength={80} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-ink-700">Their email (optional)</span>
          <input className={input} type="email" value={email} onChange={(e) => (setEmail(e.target.value), setSigned(false))} maxLength={200} />
          <span className="block text-xs text-ink-500">Only for a reminder on the due date. It&apos;s never sent to the AI.</span>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-ink-700">The first step</span>
          <textarea
            className={`${input} min-h-20`}
            value={step}
            onChange={(e) => (setStep(e.target.value), setSigned(false))}
            maxLength={300}
            placeholder="e.g. Ask IT who owns the HR spreadsheet and whether we can connect to it"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-ink-700">Done by</span>
          <input
            className={input}
            type="date"
            value={due}
            min={toIso(today)}
            max={toIso(new Date(today.getTime() + 30 * 86_400_000))}
            onChange={(e) => (setDue(e.target.value), setSigned(false))}
          />
        </label>
        {error && (
          <p className="text-sm text-danger-700" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full text-lg" disabled={pending || !owner.trim() || step.trim().length < 5}>
          {pending ? "Signing…" : signed ? "Update our pledge" : "Sign our pledge"}
        </Button>
        <Stamp show={celebrate} text="Pledged" tone="green" />
        {signed && !celebrate && <p className="text-center text-sm font-semibold text-green-700">Pledged. You can still change it until the session moves on.</p>}
      </form>
    </main>
  );
}
