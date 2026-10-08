"use client";

import { motion } from "motion/react";
import { useRef } from "react";
import { SPRINGS } from "@/components/game/springs";

// A 5×5 board: effort runs left (low) to right (high), impact runs bottom
// (low) to top (high). The team's card is a token they drag, tap a square to
// place, or move with the arrow keys.
export function ImpactEffortGrid({
  impact,
  effort,
  label,
  onChange,
  disabled = false,
}: {
  impact: number | null;
  effort: number | null;
  label: string;
  onChange: (impact: number, effort: number) => void;
  disabled?: boolean;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const placed = impact !== null && effort !== null;
  const cell = 100 / 5;

  const placeFromPoint = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const e = Math.min(5, Math.max(1, Math.ceil(((clientX - rect.left) / rect.width) * 5)));
    const i = Math.min(5, Math.max(1, 6 - Math.ceil(((clientY - rect.top) / rect.height) * 5)));
    onChange(i, e);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-stretch gap-2">
        <div className="flex w-6 items-center justify-center">
          <span className="-rotate-90 text-xs font-bold tracking-wider whitespace-nowrap text-ink-500 uppercase">Impact →</span>
        </div>
        <div
          ref={boardRef}
          className="relative aspect-square w-full touch-none overflow-hidden rounded-2xl border-2 border-cream-300 bg-cream-50 select-none"
          role="group"
          aria-label="Impact and effort board"
        >
          {/* Quadrant tints and names */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            <Quadrant tone="bg-green-50" name="Quick wins" />
            <Quadrant tone="bg-amber-50" name="Big bets" align="right" />
            <Quadrant tone="bg-cream-100" name="Nice to have" valign="bottom" />
            <Quadrant tone="bg-cream-200/60" name="Not worth it" align="right" valign="bottom" />
          </div>
          {/* Tap targets */}
          <div className="absolute inset-0 grid grid-cols-5 grid-rows-5">
            {Array.from({ length: 25 }, (_, n) => {
              const row = Math.floor(n / 5);
              const col = n % 5;
              const i = 5 - row;
              const e = col + 1;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(i, e)}
                  className="border border-dashed border-cream-300/60 hover:bg-green-100/40"
                  aria-label={`Impact ${i}, effort ${e}`}
                />
              );
            })}
          </div>
          {/* The team's card */}
          <motion.button
            type="button"
            drag={!disabled}
            dragMomentum={false}
            dragConstraints={boardRef}
            dragElastic={0}
            onDragEnd={(_, info) => placeFromPoint(info.point.x - window.scrollX, info.point.y - window.scrollY)}
            onKeyDown={(e) => {
              if (disabled) return;
              const i = impact ?? 3;
              const f = effort ?? 3;
              const moves: Record<string, [number, number]> = { ArrowUp: [1, 0], ArrowDown: [-1, 0], ArrowRight: [0, 1], ArrowLeft: [0, -1] };
              const m = moves[e.key];
              if (!m) return;
              e.preventDefault();
              onChange(Math.min(5, Math.max(1, i + m[0])), Math.min(5, Math.max(1, f + m[1])));
            }}
            aria-label={`${label}: ${placed ? `impact ${impact} of 5, effort ${effort} of 5` : "not placed yet"}. Use the arrow keys to move.`}
            className={`absolute z-10 flex h-[17%] w-[17%] cursor-grab items-center justify-center rounded-xl border-b-4 border-green-800 bg-green-600 p-1 text-center text-[10px] leading-tight font-bold text-cream-50 shadow-lift active:cursor-grabbing sm:text-xs ${
              placed ? "" : "opacity-90"
            }`}
            // Remount on every move so drag offsets reset to the new square.
            key={`${impact}-${effort}`}
            initial={false}
            animate={{ scale: 1 }}
            whileDrag={{ scale: 1.15, rotate: -4 }}
            transition={SPRINGS.bouncy}
            style={{
              left: `${((effort ?? 3) - 1) * cell + 1.5}%`,
              top: `${(5 - (impact ?? 3)) * cell + 1.5}%`,
            }}
          >
            {placed ? label : "Drag me"}
          </motion.button>
        </div>
      </div>
      <p className="pl-8 text-right text-xs font-bold tracking-wider text-ink-500 uppercase">Effort →</p>
    </div>
  );
}

function Quadrant({ tone, name, align = "left", valign = "top" }: { tone: string; name: string; align?: "left" | "right"; valign?: "top" | "bottom" }) {
  return (
    <div className={`flex p-2 ${tone} ${align === "right" ? "justify-end" : ""} ${valign === "bottom" ? "items-end" : ""}`}>
      <span className="text-[11px] font-bold tracking-wide text-ink-500/80 uppercase">{name}</span>
    </div>
  );
}
