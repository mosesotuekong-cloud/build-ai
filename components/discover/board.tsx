"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Connector } from "@/components/game/connector";
import { SlotSocket } from "@/components/game/slot-socket";
import { SPRINGS } from "@/components/game/springs";
import { CANVAS_SLOTS } from "@/lib/ai/schemas/canvas";
import type { Badge, LEVELS } from "@/lib/discover/score";

type Slots = { trigger: string; steps: string; decision: string; action: string; human: string; oversight: string | null };

// The board: the five design slots as sockets. A card's tile snaps into its
// socket when the team passes the card, and the connectors light up as the
// design joins together, so a finished design glows like a circuit.
export function Board({ slots, fixDone, worthDone, activeSlot }: { slots: Slots; fixDone: boolean; worthDone: boolean; activeSlot: string | null }) {
  const filled = (s: (typeof CANVAS_SLOTS)[number]) => Boolean(slots[s].trim() || (s === "human" && slots.oversight));
  return (
    <div className="space-y-2" aria-label="Your design so far">
      <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-ink-500 uppercase">
        <Token on={fixDone} label="Fix it first" icon="🧹" />
        <span className="h-px flex-1 bg-cream-300" aria-hidden />
        <Token on={worthDone} label="Worth it?" icon="🎯" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] sm:items-stretch sm:gap-0">
        {CANVAS_SLOTS.map((slot, i) => (
          <div key={slot} className="contents">
            <div className="[&_p]:line-clamp-3">
              <SlotSocket slot={slot} value={slots[slot]} oversight={slot === "human" ? slots.oversight : null} active={activeSlot === slot} compact />
            </div>
            {i < CANVAS_SLOTS.length - 1 && (
              <div className="hidden items-center sm:flex">
                <Connector lit={filled(slot) && filled(CANVAS_SLOTS[i + 1])} tone={CANVAS_SLOTS[i + 1] === "human" ? "amber" : "green"} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Token({ on, label, icon }: { on: boolean; label: string; icon: string }) {
  return (
    <motion.span
      className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 ${on ? "border-green-600 bg-green-600 text-cream-50" : "border-dashed border-cream-300 text-ink-500"}`}
      animate={on ? { scale: [1, 1.15, 1] } : { scale: 1 }}
      // Three keyframes need a timed animation; springs only take two.
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <span aria-hidden>{icon}</span>
      {label}
      {on && <span aria-hidden>✓</span>}
    </motion.span>
  );
}

// The discovery score: points, level and a bar to the next level.
export function ScoreBar({ points, max, level, next }: { points: number; max: number; level: string; next: (typeof LEVELS)[number] | { title: string; min: number } | null }) {
  return (
    <div className="flex min-w-56 items-center gap-3 rounded-2xl border border-cream-300 bg-cream-50 px-4 py-2 shadow-card" aria-label={`Discovery score ${points} of ${max}, level ${level}`}>
      <span className="text-2xl" aria-hidden>
        🏅
      </span>
      <div className="flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <motion.span key={points} className="font-display text-xl font-bold tabular-nums" initial={{ scale: 1.3 }} animate={{ scale: 1 }} transition={SPRINGS.bouncy}>
            {points}
          </motion.span>
          <span className="text-sm font-bold text-green-700">{level}</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream-200">
          <motion.div className="h-full rounded-full bg-amber-400" initial={false} animate={{ width: `${(points / max) * 100}%` }} transition={SPRINGS.gentle} />
        </div>
        {next && <p className="mt-0.5 text-[11px] text-ink-500">{next.min - points} to {next.title}</p>}
      </div>
    </div>
  );
}

// Pops a badge when it's newly earned. Badges already earned when the screen
// opens don't pop again.
export function BadgeToasts({ badges }: { badges: Badge[] }) {
  const seen = useRef<Set<string> | null>(null);
  const [queue, setQueue] = useState<Badge[]>([]);
  useEffect(() => {
    const earned = badges.filter((b) => b.earned);
    if (!seen.current) {
      seen.current = new Set(earned.map((b) => b.key));
      return;
    }
    const fresh = earned.filter((b) => !seen.current!.has(b.key));
    if (!fresh.length) return;
    fresh.forEach((b) => seen.current!.add(b.key));
    setQueue((q) => [...q, ...fresh]);
  }, [badges]);
  useEffect(() => {
    if (!queue.length) return;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), 3200);
    return () => clearTimeout(t);
  }, [queue]);
  const current = queue[0];
  return (
    <div className="pointer-events-none fixed bottom-6 left-6 z-40" aria-live="polite">
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.key}
            className="flex items-center gap-3 rounded-2xl border-2 border-amber-400 bg-cream-50 px-4 py-3 shadow-lift"
            initial={{ y: 40, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={SPRINGS.bouncy}
          >
            <span className="text-3xl" aria-hidden>
              {current.icon}
            </span>
            <div>
              <p className="text-xs font-bold tracking-wide text-amber-700 uppercase">Badge earned · +{current.points}</p>
              <p className="font-display text-lg font-bold">{current.title}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// All badges, earned and still to earn, with how to earn them.
export function BadgeShelf({ badges }: { badges: Badge[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {badges.map((b) => (
        <li key={b.key} className={`flex items-start gap-3 rounded-xl border-2 p-3 ${b.earned ? "border-amber-400 bg-amber-50" : "border-dashed border-cream-300 bg-cream-50 opacity-70"}`}>
          <span className={`text-2xl ${b.earned ? "" : "grayscale"}`} aria-hidden>
            {b.icon}
          </span>
          <div>
            <p className="font-bold">
              {b.title} <span className="text-sm font-semibold text-ink-500">+{b.points}</span>
            </p>
            <p className="text-sm text-ink-700">{b.earned ? b.blurb : `To earn: ${b.blurb.charAt(0).toLowerCase()}${b.blurb.slice(1)}`}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
