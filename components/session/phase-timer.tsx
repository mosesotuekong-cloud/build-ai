"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

// Counts down the current phase. The server stores when the phase started and
// how long it lasts; every screen computes the same countdown from those, and
// `serverNow` corrects for a phone whose clock is off.
export function PhaseTimer({
  startedAt,
  durationSeconds,
  serverNow,
  size = "md",
}: {
  startedAt: string | null;
  durationSeconds: number | null;
  serverNow: string;
  size?: "sm" | "md" | "xl";
}) {
  const [offset] = useState(() => new Date(serverNow).getTime() - Date.now());
  const [now, setNow] = useState(() => Date.now() + offset);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(tick);
  }, [offset]);

  if (!startedAt || !durationSeconds) return null;
  const remaining = Math.max(0, Math.round((new Date(startedAt).getTime() + durationSeconds * 1000 - now) / 1000));
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const urgent = remaining <= 60;
  const done = remaining === 0;
  const sizes = { sm: "text-lg px-3 py-1", md: "text-2xl px-4 py-1.5", xl: "text-8xl px-8 py-4" };

  return (
    <motion.span
      role="timer"
      aria-label={done ? "Time is up" : `${minutes} minutes ${seconds} seconds left`}
      className={`inline-block rounded-2xl font-display font-bold tabular-nums ${sizes[size]} ${
        done ? "bg-danger-50 text-danger-700" : urgent ? "bg-amber-100 text-amber-700" : "bg-green-50 text-green-700"
      }`}
      animate={urgent && !done ? { scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={urgent && !done ? { duration: 1, repeat: Infinity } : undefined}
    >
      {done ? "Time's up" : `${minutes}:${String(seconds).padStart(2, "0")}`}
    </motion.span>
  );
}
