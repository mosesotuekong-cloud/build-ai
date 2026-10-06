"use client";

import { animate, motion, useAnimate, useMotionValue, useTransform } from "motion/react";
import { useEffect, useState } from "react";

// A ring that fills while the score counts up, then settles with a wobble.
export function ScoreRing({ value, max = 100, size = 160, label = "Score" }: { value: number; max?: number; size?: number; label?: string }) {
  const stroke = Math.round(size / 11);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useMotionValue(0);
  const dashOffset = useTransform(progress, (p) => circumference * (1 - p / max));
  const [shown, setShown] = useState(0);
  const [scope, animateScope] = useAnimate<HTMLDivElement>();

  useEffect(() => {
    const unsubscribe = progress.on("change", (v) => setShown(Math.round(v)));
    const controls = animate(progress, value, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      // Settle with a little wobble once the count lands.
      onComplete: () => {
        if (scope.current) animateScope(scope.current, { scale: [1, 1.08, 0.97, 1] }, { duration: 0.5 });
      },
    });
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, progress, scope, animateScope]);

  return (
    <div
      ref={scope}
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${value} out of ${max}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-cream-300)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-green-600)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dashOffset }}
        />
      </svg>
      <div className="absolute flex items-baseline gap-0.5" aria-hidden>
        <span className="font-display font-bold text-ink-900" style={{ fontSize: size * 0.3 }}>
          {shown}
        </span>
        <span className="font-bold text-ink-500" style={{ fontSize: size * 0.11 }}>
          /{max}
        </span>
      </div>
    </div>
  );
}
