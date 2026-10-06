"use client";

import { AnimatePresence, motion, useAnimate } from "motion/react";
import { useCallback } from "react";
import { SPRINGS } from "./springs";

// A rubber stamp that slams onto whatever it sits over: "TWIST", "LOCKED IN".
// Place it inside a `relative` container.
export function Stamp({ show, text, tone = "amber" }: { show: boolean; text: string; tone?: "amber" | "green" }) {
  const colours = tone === "amber" ? "border-amber-500 text-amber-500 bg-amber-50/85" : "border-green-600 text-green-600 bg-green-50/85";
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={text}
          role="status"
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
        >
          <motion.span
            className={`rounded-xl border-[6px] px-6 py-2 font-display text-5xl font-bold tracking-[0.18em] uppercase shadow-lift sm:text-6xl ${colours}`}
            initial={{ scale: 2.6, rotate: -18, opacity: 0 }}
            animate={{ scale: 1, rotate: -8, opacity: 1 }}
            transition={SPRINGS.heavy}
          >
            {text}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Shakes an element, e.g. the canvas when a stamp lands. Also buzzes the phone
// where the browser supports it (Android Chrome).
export function useShake<T extends HTMLElement = HTMLDivElement>() {
  const [scope, animate] = useAnimate<T>();
  const shake = useCallback(async ({ vibrate = false }: { vibrate?: boolean } = {}) => {
    if (vibrate && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([60, 40, 90]);
    if (!scope.current) return;
    await animate(scope.current, { x: [0, -10, 9, -7, 5, -2, 0], rotate: [0, -0.6, 0.5, -0.3, 0] }, { duration: 0.45 });
  }, [animate, scope]);
  return [scope, shake] as const;
}
