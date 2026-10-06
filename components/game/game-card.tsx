"use client";

import { motion } from "motion/react";
import { APP_NAME } from "@/lib/config/app";
import { SPRINGS } from "./springs";

export type GameCardProps = {
  title: string;
  story?: string;
  cost?: string;
  whoFeelsIt?: string;
  // Small label on the card's top band, e.g. "HR".
  label?: string;
  number?: number;
  // Face down shows the card back.
  faceDown?: boolean;
  tilt?: number;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
};

const SIZES = {
  sm: "w-36 h-52 text-[11px]",
  md: "w-60 h-[23rem] text-sm",
  lg: "w-72 h-[26rem] text-base",
};

// A case study as a physical game card. Flips between face down and face up,
// lifts and straightens on hover, and can be selected.
export function GameCard({
  title,
  story,
  cost,
  whoFeelsIt,
  label,
  number,
  faceDown = false,
  tilt = 0,
  size = "md",
  selected = false,
  onSelect,
  className = "",
}: GameCardProps) {
  const interactive = Boolean(onSelect);
  return (
    <motion.div
      className={`relative shrink-0 [perspective:1200px] ${SIZES[size]} ${className}`}
      style={{ rotate: tilt }}
      whileHover={interactive ? { y: -10, rotate: 0, scale: 1.03 } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      transition={SPRINGS.bouncy}
    >
      <motion.button
        type="button"
        disabled={!interactive}
        onClick={onSelect}
        aria-pressed={interactive ? selected : undefined}
        aria-label={faceDown ? "Face-down case card" : title}
        className="relative h-full w-full cursor-default rounded-2xl text-left [transform-style:preserve-3d] enabled:cursor-pointer"
        animate={{ rotateY: faceDown ? 180 : 0 }}
        transition={SPRINGS.gentle}
      >
        {/* Front */}
        <div
          className={`absolute inset-0 flex flex-col overflow-hidden rounded-2xl border bg-cream-50 shadow-card [backface-visibility:hidden] ${
            selected ? "border-green-600 ring-4 ring-green-200" : "border-cream-300"
          }`}
        >
          <div className="flex items-center justify-between bg-green-600 px-4 py-2 font-bold uppercase tracking-wider text-cream-50">
            <span>{label ?? "Case"}</span>
            {number !== undefined && <span className="font-display">{String(number).padStart(2, "0")}</span>}
          </div>
          <div className="flex flex-1 flex-col gap-2 p-4">
            <h3 className="font-display text-[1.35em] leading-tight font-bold text-ink-900">{title}</h3>
            {story && <p className="line-clamp-5 leading-snug text-ink-700">{story}</p>}
            <div className="mt-auto space-y-1">
              {cost && <p className="font-semibold leading-snug text-green-700">{cost}</p>}
              {whoFeelsIt && <p className="text-[0.85em] text-ink-500">Who feels it: {whoFeelsIt}</p>}
            </div>
          </div>
        </div>

        {/* Back */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl border border-green-700 bg-green-600 shadow-card [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="absolute inset-3 rounded-xl border-2 border-dashed border-green-400/60" />
          <div className="absolute inset-0 opacity-15 [background-image:radial-gradient(circle_at_center,var(--color-cream-100)_1.5px,transparent_1.6px)] [background-size:14px_14px]" />
          <span className="relative font-display text-[1.6em] font-bold tracking-[0.12em] text-cream-100">
            {APP_NAME.toUpperCase().slice(0, -1)}
            <span className="text-amber-400">{APP_NAME.toUpperCase().slice(-1)}</span>
          </span>
        </div>
      </motion.button>
    </motion.div>
  );
}
