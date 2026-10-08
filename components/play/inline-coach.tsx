"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { SPRINGS } from "@/components/game/springs";
import { CANVAS_SLOTS, type CanvasSlot } from "@/lib/ai/schemas/canvas";

export type InlineMessage = { id: string; slot: string | null; content: string; type: string | null; trigger?: string | null };

// A small speech bubble from the coach, beside a slot that's still empty.
// Never a pop-up window; the team can answer it in the coach thread or just
// get on with the slot.
export function InlineCoachBubble({ message, onReply, onDismiss }: { message: InlineMessage | null; onReply: () => void; onDismiss: () => void }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message.id}
          role="note"
          aria-label="A question from the coach"
          className="relative mt-2 ml-6 rounded-2xl rounded-tl-sm border-2 border-green-200 bg-green-50 px-4 py-3 shadow-card"
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={SPRINGS.bouncy}
        >
          <p className="text-[11px] font-bold tracking-wider text-green-700 uppercase">Coach</p>
          <p className="text-sm leading-snug text-ink-900">{message.content}</p>
          <div className="mt-2 flex gap-3 text-sm font-semibold">
            <button type="button" onClick={onReply} className="text-green-700 hover:underline">
              Talk it through
            </button>
            <button type="button" onClick={onDismiss} className="text-ink-500 hover:underline">
              Got it
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Watches for slots that are still empty after the idle delay and asks the
// server for one inline question per slot. The server double-checks timing
// and keeps it to one per slot across all the team's phones.
export function useInlineCoach({
  teamId,
  enabled,
  design,
  existing,
  startedAt,
  serverOffsetMs,
  idleMinutes,
  onMessage,
}: {
  teamId: string;
  enabled: boolean;
  design: Record<CanvasSlot, string>;
  existing: InlineMessage[];
  startedAt: string | null;
  serverOffsetMs: number;
  idleMinutes: number;
  onMessage: (message: InlineMessage) => void;
}) {
  const asked = useRef<Set<string>>(new Set());
  const designRef = useRef(design);
  const existingRef = useRef(existing);
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    designRef.current = design;
    existingRef.current = existing;
    onMessageRef.current = onMessage;
  });

  useEffect(() => {
    if (!enabled || !startedAt) return;
    const due = new Date(startedAt).getTime() + idleMinutes * 60_000;
    let busy = false;

    const check = async () => {
      if (busy || Date.now() + serverOffsetMs < due) return;
      const slot = CANVAS_SLOTS.find(
        (s) => !designRef.current[s].trim() && !asked.current.has(s) && !existingRef.current.some((m) => m.slot === s),
      );
      if (!slot) return;
      busy = true;
      asked.current.add(slot);
      try {
        const response = await fetch("/api/coach/inline", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ teamId, slot }),
        });
        if (response.ok) {
          const { message } = await response.json();
          if (message) onMessageRef.current(message);
        }
      } catch {
        // A missed nudge is fine; the team can always ask the coach.
      } finally {
        busy = false;
      }
    };

    const tick = setInterval(check, 15_000);
    const first = setTimeout(check, 1500);
    return () => {
      clearInterval(tick);
      clearTimeout(first);
    };
  }, [enabled, startedAt, idleMinutes, serverOffsetMs, teamId]);
}
