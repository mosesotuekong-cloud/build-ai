"use client";

import { AnimatePresence, motion } from "motion/react";
import { SPRINGS } from "./springs";

// Hint tokens as coins. Spending one flips it up and away; a new one (for
// example the twist bonus) drops in with a bounce.
export function TokenCoins({ count, size = "md", label = "Hint tokens" }: { count: number; size?: "sm" | "md"; label?: string }) {
  const dims = size === "sm" ? "h-7 w-7 text-xs" : "h-10 w-10 text-sm";
  return (
    <div className="flex items-center gap-3">
      <span className="sr-only">
        {label}: {count}
      </span>
      <div className="flex items-center -space-x-2" aria-hidden>
        <AnimatePresence initial={false} mode="popLayout">
          {Array.from({ length: count }, (_, i) => (
            <motion.span
              key={i}
              layout
              className={`relative flex items-center justify-center rounded-full border-2 border-amber-500 bg-amber-400 font-display font-bold text-ink-900 shadow-[inset_0_-3px_0_rgba(0,0,0,0.15),0_2px_6px_rgba(27,31,29,0.25)] ${dims}`}
              initial={{ y: -60, opacity: 0, rotate: -30 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              exit={{ y: -70, opacity: 0, rotateY: 540, scale: 1.2, transition: { duration: 0.6, ease: "easeOut" } }}
              transition={SPRINGS.bouncy}
            >
              <span className="absolute inset-1 rounded-full border border-amber-500/60" />B
            </motion.span>
          ))}
        </AnimatePresence>
        {count === 0 && <span className={`rounded-full border-2 border-dashed border-cream-300 ${dims}`} />}
      </div>
      <motion.span key={count} className="font-display text-lg font-bold text-ink-700" initial={{ scale: 1.5 }} animate={{ scale: 1 }} transition={SPRINGS.bouncy}>
        ×{count}
      </motion.span>
    </div>
  );
}
