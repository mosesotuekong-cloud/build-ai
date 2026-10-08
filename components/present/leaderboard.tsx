"use client";

import { motion } from "motion/react";
import { SPRINGS } from "@/components/game/springs";
import type { Award } from "@/lib/judging/awards";

export type BoardRow = { id: string; name: string; final: number };

// The projector leaderboard: bars grow in rank order, lowest first, so the
// winner lands last. Then the awards pop in.
export function Leaderboard({ rows, awards }: { rows: BoardRow[]; awards: Award[] }) {
  const max = Math.max(100, ...rows.map((r) => r.final));
  const revealOrder = [...rows].reverse();
  const delayFor = (id: string) => 0.4 + revealOrder.findIndex((r) => r.id === id) * 0.6;
  const awardsStart = 0.6 + rows.length * 0.6;

  return (
    <div className="w-full max-w-5xl space-y-8">
      <ol className="space-y-3" aria-label="Leaderboard">
        {rows.map((row, i) => (
          <motion.li
            key={row.id}
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...SPRINGS.gentle, delay: delayFor(row.id) }}
          >
            <span className="w-10 text-right font-display text-4xl font-bold text-ink-500">{i + 1}</span>
            <div className="relative h-16 flex-1 overflow-hidden rounded-2xl bg-cream-200">
              <motion.div
                className={`absolute inset-y-0 left-0 origin-left rounded-2xl ${i === 0 ? "bg-amber-400" : "bg-green-600"}`}
                style={{ width: `${(row.final / max) * 100}%` }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ ...SPRINGS.gentle, delay: delayFor(row.id) + 0.2 }}
              />
              <span className={`absolute inset-y-0 left-5 flex items-center font-display text-3xl font-bold ${i === 0 ? "text-ink-900" : "text-cream-50"}`}>{row.name}</span>
            </div>
            <span className="w-24 font-display text-5xl font-bold text-ink-900">{row.final}</span>
          </motion.li>
        ))}
      </ol>

      {awards.length > 0 && (
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3" aria-label="Awards">
          {awards.map((a, i) => (
            <motion.li
              key={a.key}
              className="rounded-3xl border-4 border-amber-400 bg-amber-50 p-5 text-center shadow-lift"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...SPRINGS.heavy, delay: awardsStart + i * 0.5 }}
            >
              <p className="font-display text-2xl font-bold">{a.title}</p>
              <p className="text-3xl font-bold text-green-700">{a.teamName}</p>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}

// While the judges deliberate: cards shuffle and the count ticks up.
export function Drumroll({ done, total }: { done: number; total: number }) {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex gap-4" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="h-28 w-20 rounded-2xl border-b-4 border-green-800 bg-green-600 shadow-lift"
            animate={{ y: [0, -24, 0], rotate: [0, i % 2 ? 6 : -6, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }}
          />
        ))}
      </div>
      <p className="font-display text-5xl font-bold">The judges are deliberating…</p>
      <p className="text-3xl text-ink-700" role="status">
        {done} of {total} designs judged
      </p>
    </div>
  );
}
