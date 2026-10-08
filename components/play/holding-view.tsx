"use client";

import { motion } from "motion/react";
import { SPRINGS } from "@/components/game/springs";
import { PhaseTimer } from "@/components/session/phase-timer";
import { Wordmark } from "@/components/ui/wordmark";

// Shown on phones during phases with no team task yet, and when a session ends.
export function HoldingView({
  title,
  message,
  teamName,
  timer,
}: {
  title: string;
  message: string;
  teamName: string;
  timer: { startedAt: string | null; duration: number | null; serverNow: string };
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <Wordmark size="sm" />
      <motion.div
        key={title}
        initial={{ scale: 0.8, opacity: 0, rotate: -3 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={SPRINGS.bouncy}
        className="w-full max-w-md space-y-3 rounded-3xl border border-cream-300 bg-cream-50 p-8 shadow-card"
      >
        <p className="text-sm font-bold tracking-wider text-green-700 uppercase">{teamName}</p>
        <h1 className="font-display text-4xl font-bold">{title}</h1>
        <p className="text-lg text-ink-700">{message}</p>
        <PhaseTimer startedAt={timer.startedAt} durationSeconds={timer.duration} serverNow={timer.serverNow} />
      </motion.div>
    </main>
  );
}
