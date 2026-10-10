"use client";

import { AnimatePresence, motion } from "motion/react";
import { oversightLabel, SLOT_LABELS, type CanvasSlot } from "@/lib/ai/schemas/canvas";
import { SPRINGS } from "./springs";

export type SlotSocketProps = {
  slot: CanvasSlot;
  value?: string;
  // Highlights the socket the team is working on.
  active?: boolean;
  compact?: boolean;
  className?: string;
  // Control only: in, on or out of the loop, shown as a badge.
  oversight?: string | null;
};

// One of the five canvas slots as a socket on a board. Empty, it is a recessed
// dashed outline; filled, a tile snaps into it with a spring. Control (the
// human slot) is always amber.
export function SlotSocket({ slot, value, active = false, compact = false, className = "", oversight = null }: SlotSocketProps) {
  const level = slot === "human" ? oversightLabel(oversight) : null;
  const filled = Boolean((value && value.trim()) || level);
  const isHuman = slot === "human";
  const index = ["trigger", "steps", "decision", "action", "human"].indexOf(slot) + 1;
  const { title, prompt } = SLOT_LABELS[slot];

  return (
    <div
      className={`relative grid rounded-2xl ${compact ? "min-h-20 lg:min-h-32" : "min-h-40"} ${
        isHuman ? "bg-amber-50" : "bg-cream-200/70"
      } shadow-socket ${active ? (isHuman ? "ring-4 ring-amber-300" : "ring-4 ring-green-200") : ""} ${className}`}
    >
      {/* Empty socket */}
      <div
        className={`m-2 flex flex-col justify-between gap-2 rounded-xl border-2 border-dashed p-3 [grid-area:1/1] ${
          isHuman ? "border-amber-400/70" : "border-cream-300"
        }`}
      >
        <div className="flex items-center gap-2">
          <SlotNumber index={index} isHuman={isHuman} muted />
          <span className={`text-xs font-bold uppercase leading-tight tracking-wide ${isHuman ? "text-amber-700" : "text-ink-500"}`}>{title}</span>
        </div>
        <p className="text-sm text-ink-500">{prompt}</p>
      </div>

      {/* Filled tile */}
      <AnimatePresence>
        {filled && (
          <motion.div
            key={`${value}|${level}`}
            className={`z-10 flex flex-col gap-2 rounded-2xl border-b-4 p-3 shadow-lift [grid-area:1/1] ${
              isHuman ? "border-amber-500 bg-amber-400 text-ink-900" : "border-green-800 bg-green-600 text-cream-50"
            }`}
            initial={{ opacity: 0, y: -28, scale: 1.08, rotate: -2 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={SPRINGS.bouncy}
          >
            <div className="flex items-center gap-2">
              <SlotNumber index={index} isHuman={isHuman} />
              <span className="text-xs font-bold uppercase leading-tight tracking-wide opacity-90">{title}</span>
              <motion.span
                className="ml-auto text-lg"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ ...SPRINGS.bouncy, delay: 0.15 }}
                aria-hidden
              >
                ✓
              </motion.span>
            </div>
            {level && <span className="w-fit rounded-full bg-ink-900 px-2.5 py-0.5 text-xs font-bold text-amber-300">{level}</span>}
            {value && <p className={`leading-snug ${compact ? "text-sm" : ""}`}>{value}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SlotNumber({ index, isHuman, muted = false }: { index: number; isHuman: boolean; muted?: boolean }) {
  const colours = muted
    ? isHuman
      ? "border-amber-400 text-amber-700"
      : "border-cream-300 text-ink-500"
    : isHuman
      ? "border-ink-900/20 bg-cream-50 text-ink-900"
      : "border-cream-50/30 bg-green-700 text-cream-50";
  return (
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 font-display text-sm font-bold ${colours}`}>
      {index}
    </span>
  );
}
