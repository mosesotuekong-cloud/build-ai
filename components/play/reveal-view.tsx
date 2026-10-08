"use client";

import { motion } from "motion/react";
import { SPRINGS } from "@/components/game/springs";
import { Wordmark } from "@/components/ui/wordmark";
import type { ReferenceSolution, ScoredCriterion } from "@/lib/ai/schemas/judge";
import type { CoachDesign } from "@/lib/coach/context";
import type { Award } from "@/lib/judging/awards";
import { Results } from "./results";

// The reveal on a team's phone: their score, any awards they won, the model
// answer beside their design, and how to build it on their stack.
export function RevealView({
  teamName,
  design,
  score,
  scoring,
  reference,
  platforms,
  awards,
  overridden,
}: {
  teamName: string;
  design: CoachDesign;
  score: { total: number; breakdown: ScoredCriterion[]; summary: string } | null;
  scoring: boolean;
  reference: ReferenceSolution | null;
  platforms: string[];
  awards: Award[];
  overridden: boolean;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <Wordmark size="sm" />
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 uppercase">{teamName} · Reveal</span>
      </header>

      {awards.length > 0 && (
        <ul className="space-y-3" aria-label="Your awards">
          {awards.map((a, i) => (
            <motion.li
              key={a.key}
              className="rounded-3xl border-4 border-amber-400 bg-amber-50 p-5 text-center shadow-lift"
              initial={{ scale: 0, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...SPRINGS.heavy, delay: 0.3 + i * 0.3 }}
            >
              <p className="text-sm font-bold tracking-wider text-amber-700 uppercase">Award</p>
              <p className="font-display text-3xl font-bold">{a.title}</p>
              <p className="text-ink-700">{a.reason}</p>
            </motion.li>
          ))}
        </ul>
      )}

      {scoring && !score ? (
        <p className="rounded-2xl bg-cream-200/60 p-5 text-center text-lg text-ink-700" role="status">
          Your score is on its way…
        </p>
      ) : (
        <Results design={design} score={score} reference={reference} platforms={platforms} />
      )}
      {overridden && <p className="text-center text-sm text-ink-500">Your facilitator adjusted your final score.</p>}
    </main>
  );
}
