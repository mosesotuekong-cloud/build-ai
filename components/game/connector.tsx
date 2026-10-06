"use client";

import { motion } from "motion/react";

// The link between two slots. When both ends are filled it lights up and a
// pulse travels along it, so a finished design glows like a circuit.
export function Connector({
  lit,
  tone = "green",
  direction = "horizontal",
}: {
  lit: boolean;
  tone?: "green" | "amber";
  direction?: "horizontal" | "vertical";
}) {
  const horizontal = direction === "horizontal";
  const litColour = tone === "amber" ? "bg-amber-400" : "bg-green-500";

  return (
    <div
      aria-hidden
      className={`relative flex shrink-0 items-center justify-center ${horizontal ? "h-6 w-8" : "h-6 w-6"}`}
    >
      <div className={`relative overflow-hidden rounded-full bg-cream-300 ${horizontal ? "h-1.5 w-full" : "h-full w-1.5"}`}>
        <motion.div
          className={`absolute inset-0 origin-left rounded-full ${litColour} ${horizontal ? "" : "origin-top"}`}
          initial={false}
          animate={horizontal ? { scaleX: lit ? 1 : 0 } : { scaleY: lit ? 1 : 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
        {lit && (
          <motion.div
            className={`absolute rounded-full bg-cream-50/90 ${horizontal ? "top-0 h-full w-2" : "left-0 h-2 w-full"}`}
            initial={horizontal ? { x: "-100%" } : { y: "-100%" }}
            animate={horizontal ? { x: "400%" } : { y: "400%" }}
            transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 0.9, ease: "easeInOut" }}
          />
        )}
      </div>
      <motion.span
        className={`absolute font-bold leading-none ${lit ? (tone === "amber" ? "text-amber-500" : "text-green-600") : "text-cream-300"} ${
          horizontal ? "-right-1" : "-bottom-1 rotate-90"
        }`}
        animate={{ scale: lit ? [1, 1.4, 1] : 1 }}
        transition={{ duration: 0.35 }}
      >
        ›
      </motion.span>
    </div>
  );
}
