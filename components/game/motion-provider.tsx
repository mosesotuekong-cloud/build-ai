"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

// Honours the device's "reduce motion" setting everywhere: transforms are
// skipped, opacity fades still play.
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
