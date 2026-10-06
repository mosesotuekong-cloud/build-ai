"use client";

import { motion } from "motion/react";
import { CANVAS_SLOTS, SLOT_LABELS, type CanvasSlot } from "@/lib/ai/schemas/canvas";
import { SPRINGS } from "./springs";

// Five segments showing which slots a team has filled, never what is in them.
// Used on the presenter screen and the facilitator view.
export function SlotMeter({ filled, size = "md" }: { filled: Partial<Record<CanvasSlot, boolean>>; size?: "sm" | "md" }) {
  const count = CANVAS_SLOTS.filter((s) => filled[s]).length;
  const h = size === "sm" ? "h-2" : "h-3";
  return (
    <div className="flex items-center gap-1.5" role="meter" aria-valuemin={0} aria-valuemax={5} aria-valuenow={count} aria-label="Slots filled">
      {CANVAS_SLOTS.map((slot) => {
        const on = Boolean(filled[slot]);
        const colour = slot === "human" ? "bg-amber-400" : "bg-green-500";
        return (
          <div key={slot} className={`relative flex-1 overflow-hidden rounded-full bg-cream-300 ${h}`} title={SLOT_LABELS[slot].title}>
            <motion.div
              className={`absolute inset-0 origin-left rounded-full ${colour}`}
              initial={false}
              animate={{ scaleX: on ? 1 : 0 }}
              transition={SPRINGS.bouncy}
            />
          </div>
        );
      })}
    </div>
  );
}
