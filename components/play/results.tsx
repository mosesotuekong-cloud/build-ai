"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useState } from "react";
import { ScoreRing } from "@/components/game/score-ring";
import { SPRINGS } from "@/components/game/springs";
import { Button } from "@/components/ui/button";
import { CANVAS_SLOTS, SLOT_LABELS } from "@/lib/ai/schemas/canvas";
import type { ReferenceSolution, ScoredCriterion } from "@/lib/ai/schemas/judge";
import type { CoachDesign } from "@/lib/coach/context";
import { getPlatform, type Platform } from "@/lib/config/platforms";

// The end of a practice run: score, model answer, and build guides for the
// organisation's stack.
export function Results({
  design,
  score,
  reference,
  platforms,
  onKeepGoing,
}: {
  design: CoachDesign;
  score: { total: number; breakdown: ScoredCriterion[]; summary: string } | null;
  reference: ReferenceSolution | null;
  platforms: string[];
  onKeepGoing: () => Promise<void>;
}) {
  const [reopening, setReopening] = useState(false);
  const stack = (platforms.length ? platforms : ["n8n"]).map(getPlatform).filter((p): p is Platform => Boolean(p));

  return (
    <div className="space-y-8">
      {/* Score */}
      <section className="space-y-5 rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-card">
        {score ? (
          <>
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <ScoreRing value={score.total} size={140} />
              <div className="space-y-1">
                <h2 className="font-display text-3xl font-bold">Your score</h2>
                <p className="text-ink-700">{score.summary}</p>
              </div>
            </div>
            <ul className="space-y-3">
              {score.breakdown.map((c, i) => (
                <li key={c.key} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold text-ink-900">{c.label}</span>
                    <span className="font-display font-bold text-ink-700">
                      {c.score}/{c.max}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-cream-300">
                    <motion.div
                      className={`h-full origin-left rounded-full ${c.key === "human" ? "bg-amber-400" : "bg-green-500"}`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: c.score / c.max }}
                      transition={{ ...SPRINGS.gentle, delay: 0.3 + i * 0.1 }}
                    />
                  </div>
                  <p className="text-sm text-ink-500">{c.reasoning}</p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-ink-700">We couldn&apos;t score this design just now. Keep improving it and finish again in a moment.</p>
        )}
      </section>

      {/* Model answer */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-2xl font-bold">One strong answer</h2>
          <p className="text-ink-500">A model answer for this case, next to yours. It isn&apos;t the only right answer.</p>
        </div>
        {reference ? (
          <>
            <ol className="space-y-3">
              {CANVAS_SLOTS.map((slot, i) => (
                <motion.li
                  key={slot}
                  initial={{ opacity: 0, rotateX: 70 }}
                  animate={{ opacity: 1, rotateX: 0 }}
                  transition={{ ...SPRINGS.bouncy, delay: 0.2 + i * 0.15 }}
                  className="grid gap-2 sm:grid-cols-2"
                >
                  <div className="rounded-xl border border-cream-300 bg-cream-50 p-3">
                    <p className="text-[11px] font-bold tracking-wider text-ink-500 uppercase">You · {SLOT_LABELS[slot].title}</p>
                    <p className="text-sm text-ink-700">{design[slot] || <em className="text-ink-500">Empty</em>}</p>
                  </div>
                  <div className={`rounded-xl p-3 ${slot === "human" ? "bg-amber-400 text-ink-900" : "bg-green-600 text-cream-50"}`}>
                    <p className="text-[11px] font-bold tracking-wider uppercase opacity-80">Model answer · {SLOT_LABELS[slot].title}</p>
                    <p className="text-sm">{reference[slot]}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
            <p className="rounded-xl bg-cream-200/60 p-4 leading-relaxed text-ink-700">{reference.explanation}</p>
          </>
        ) : (
          <p className="text-ink-700">The model answer isn&apos;t ready. Finish again in a moment to see it.</p>
        )}
      </section>

      {/* Build guides */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-2xl font-bold">Build it on your stack</h2>
          <p className="text-ink-500">
            How your design maps onto {platforms.length ? "your organisation's tools" : "n8n"}.{" "}
            {!platforms.length && (
              <Link href="/console/settings" className="font-semibold text-green-700 hover:underline">
                Set your AI tool stack
              </Link>
            )}
          </p>
        </div>
        <BuildGuides design={design} stack={stack} />
      </section>

      <div className="flex flex-wrap gap-3">
        <Button
          disabled={reopening}
          onClick={async () => {
            setReopening(true);
            await onKeepGoing();
          }}
        >
          {reopening ? "Opening…" : "Keep improving my design"}
        </Button>
        <Link href="/console/decks" className="inline-flex items-center rounded-xl px-5 py-3 font-semibold text-ink-700 hover:bg-cream-200">
          Back to decks
        </Link>
      </div>
    </div>
  );
}

function BuildGuides({ design, stack }: { design: CoachDesign; stack: Platform[] }) {
  const [active, setActive] = useState(stack[0]?.slug);
  const platform = stack.find((p) => p.slug === active) ?? stack[0];
  if (!platform) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Platforms">
        {stack.map((p) => (
          <button
            key={p.slug}
            role="tab"
            aria-selected={p.slug === platform.slug}
            onClick={() => setActive(p.slug)}
            className={`rounded-full border-2 px-3.5 py-1.5 text-sm font-bold ${
              p.slug === platform.slug ? "border-green-600 bg-green-600 text-cream-50" : "border-cream-300 bg-cream-50 text-ink-700 hover:border-green-400"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="space-y-3 rounded-2xl border border-cream-300 bg-cream-50 p-4">
        <p className="text-sm text-ink-500">
          <strong className="text-ink-700">{platform.name}</strong> by {platform.vendor}: {platform.goodFor}
        </p>
        <ol className="space-y-2">
          {CANVAS_SLOTS.map((slot) => (
            <li key={slot} className="grid gap-1 rounded-xl bg-white p-3 sm:grid-cols-[9rem_1fr]">
              <span className={`text-xs font-bold tracking-wide uppercase ${slot === "human" ? "text-amber-700" : "text-green-700"}`}>{SLOT_LABELS[slot].title}</span>
              <div className="space-y-1 text-sm">
                <p className="text-ink-900">{design[slot] || <em className="text-ink-500">You left this empty.</em>}</p>
                <p className="text-ink-500">On {platform.name}: {platform.slots[slot]}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-xs text-ink-500">
          {platform.export === "compiler"
            ? "A starter workflow file for this platform comes with the full export (coming soon)."
            : "This is a build guide, not a finished build. Check product names and features with your platform team."}
        </p>
      </div>
    </div>
  );
}
