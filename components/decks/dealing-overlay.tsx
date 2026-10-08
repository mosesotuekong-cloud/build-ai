"use client";

import { AnimatePresence, motion } from "motion/react";
import { GameCard } from "@/components/game/game-card";
import { SPRINGS } from "@/components/game/springs";

// Shown while the AI writes cases. Card backs shuffle so the wait feels like
// the deck is being dealt, not like a frozen screen.
export function DealingOverlay({ show, message }: { show: boolean; message: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-cream-100/90 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="relative h-56 w-72">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                animate={{
                  x: [0, (i - 2.5) * 34, 0],
                  rotate: [0, (i - 2.5) * 8, 0],
                  y: [0, -Math.abs(i - 2.5) * 6, 0],
                }}
                transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }}
              >
                <GameCard title="" faceDown size="sm" />
              </motion.div>
            ))}
          </div>
          <motion.div className="max-w-md space-y-2 text-center" initial={{ y: 12 }} animate={{ y: 0 }} transition={SPRINGS.gentle}>
            <p className="font-display text-2xl font-bold text-ink-900">{message}</p>
            <p className="text-ink-500">This usually takes under a minute. Stay on this page.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
