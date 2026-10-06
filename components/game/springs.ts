import type { Transition } from "motion/react";

// Shared spring presets so every game piece moves with the same personality.
export const SPRINGS = {
  // Quick and tidy: buttons, small badges.
  snappy: { type: "spring", stiffness: 520, damping: 32 },
  // A bit of overshoot: cards dealing, slots snapping shut.
  bouncy: { type: "spring", stiffness: 380, damping: 18 },
  // Heavy landing: stamps, the twist.
  heavy: { type: "spring", stiffness: 700, damping: 22, mass: 1.4 },
  // Slow settle: big layout moves.
  gentle: { type: "spring", stiffness: 160, damping: 22 },
} satisfies Record<string, Transition>;

// Small deterministic "random" so tilts look hand-dealt but never jump between renders.
export function seededTilt(seed: number, max = 6) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return ((x - Math.floor(x)) * 2 - 1) * max;
}
