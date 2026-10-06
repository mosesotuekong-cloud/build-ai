"use client";

import { AnimatePresence, motion, useInView } from "motion/react";
import { Fragment, useEffect, useRef, useState } from "react";
import { Connector } from "@/components/game/connector";
import { GameCard } from "@/components/game/game-card";
import { ScoreRing } from "@/components/game/score-ring";
import { SlotSocket } from "@/components/game/slot-socket";
import { SPRINGS, seededTilt } from "@/components/game/springs";
import { Stamp, useShake } from "@/components/game/stamp";
import { TokenCoins } from "@/components/game/token-coins";
import { CANVAS_SLOTS, type CanvasSlot } from "@/lib/ai/schemas/canvas";

// A looping, self-playing round of the game for the landing page. It uses the
// recruitment worked example, which is not one of the deck's cases, so it
// never gives away an answer players will meet in a session.

const DEMO_CARD = {
  title: "The CV mountain",
  story:
    "Every job advert brings 400 CVs by email and WhatsApp. One recruiter reads them all, good candidates wait three weeks for a reply, and the best ones have already accepted other offers.",
  cost: "Three weeks to reply, and the strongest candidates lost to faster employers.",
};

const DESIGN: Record<CanvasSlot, string> = {
  trigger: "Candidate submits the application form",
  steps: "CV text is read and tidied up",
  decision: "AI scores the CV against the job",
  action: "Invite, recruiter review or polite decline is sent",
  human: "Recruiter decides on every 50–69 score",
};
const HUMAN_AFTER_TWIST = "HR manager covers the 50–69 reviews while the recruiter is away";
const TWIST = "The recruiter is on leave for two weeks.";

// Timeline in milliseconds. Each step moves the scene on.
const TIMELINE = [
  { at: 0, step: "deal" },
  { at: 1900, step: "draw" },
  { at: 3300, step: "build" },
  { at: 3800, step: "fill-1" },
  { at: 4500, step: "fill-2" },
  { at: 5200, step: "fill-3" },
  { at: 5900, step: "fill-4" },
  { at: 6600, step: "fill-5" },
  { at: 8000, step: "twist" },
  { at: 9700, step: "adapt" },
  { at: 11000, step: "score" },
  { at: 16000, step: "end" },
] as const;
type Step = (typeof TIMELINE)[number]["step"];
const order = TIMELINE.map((t) => t.step) as Step[];

export function DemoGame() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.35 });
  const [step, setStep] = useState<Step>("deal");
  const [round, setRound] = useState(0);
  const [boardRef, shake] = useShake();

  // One clock drives the whole round while the demo is on screen, so steps can
  // never overlap. It counts animation frames, so a hidden or throttled tab
  // pauses the round instead of skipping ahead. At the end a new round starts.
  useEffect(() => {
    if (!inView) return;
    const end = TIMELINE[TIMELINE.length - 1].at + 400;
    let elapsed = 0;
    let last: number | undefined;
    let frame = requestAnimationFrame(function tick(now) {
      // Cap each frame's contribution so returning to the tab doesn't jump.
      elapsed += last === undefined ? 0 : Math.min(now - last, 100);
      last = now;
      if (elapsed >= end) {
        setRound((r) => r + 1);
        return;
      }
      const current = [...TIMELINE].reverse().find((t) => t.at <= elapsed)!.step;
      setStep((prev) => (prev === current ? prev : current));
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [inView, round]);

  useEffect(() => {
    if (step === "twist") void shake();
  }, [step, shake]);

  const reached = (s: Step) => order.indexOf(step) >= order.indexOf(s);
  const filledCount = ["fill-1", "fill-2", "fill-3", "fill-4", "fill-5"].filter((s) => reached(s as Step)).length;
  const value = (slot: CanvasSlot, i: number) => {
    if (i >= filledCount) return undefined;
    if (slot === "human" && reached("adapt")) return HUMAN_AFTER_TWIST;
    return DESIGN[slot];
  };
  const tokens = reached("twist") ? (reached("score") ? 3 : 4) : 3;

  return (
    <div ref={rootRef} className="relative overflow-hidden rounded-[2rem] border border-cream-300 bg-cream-50 p-4 shadow-card sm:p-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-bold tracking-wider text-cream-50 uppercase">Watch a round</span>
        <button
          type="button"
          onClick={() => {
            setStep("deal");
            setRound((r) => r + 1);
          }}
          aria-label="Replay the demo round"
          className="text-sm font-semibold text-green-700 hover:underline"
        >
          Replay
        </button>
      </div>

      <div className="relative min-h-[40rem] lg:min-h-[22rem]">
        <AnimatePresence mode="wait">
          {!reached("build") ? (
            <motion.div
              key={`deal-${round}`}
              className="absolute inset-0 flex items-start justify-center pt-10 lg:items-center lg:pt-0"
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.3 } }}
            >
              <CardFan drawn={reached("draw")} />
            </motion.div>
          ) : (
            <motion.div
              key={`build-${round}`}
              ref={boardRef}
              className="relative space-y-5"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRINGS.gentle}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold tracking-wider text-ink-500 uppercase">Your case</p>
                  <p className="font-display text-xl font-bold text-ink-900">{DEMO_CARD.title}</p>
                </div>
                <TokenCoins count={tokens} size="sm" />
              </div>

              <div className="relative">
                <div className="flex flex-col lg:flex-row lg:items-stretch">
                  {CANVAS_SLOTS.map((slot, i) => (
                    <Fragment key={slot}>
                      {i > 0 && (
                        <div className="flex justify-center lg:items-center">
                          <span className="lg:hidden">
                            <Connector lit={filledCount > i} tone={slot === "human" ? "amber" : "green"} direction="vertical" />
                          </span>
                          <span className="hidden lg:flex">
                            <Connector lit={filledCount > i} tone={slot === "human" ? "amber" : "green"} />
                          </span>
                        </div>
                      )}
                      <SlotSocket slot={slot} value={value(slot, i)} active={i === filledCount && filledCount < 5} compact className="flex-1" />
                    </Fragment>
                  ))}
                </div>
                <Stamp show={reached("twist") && !reached("score")} text="Twist" />
              </div>

              <AnimatePresence mode="wait">
                {reached("twist") && !reached("score") && (
                  <motion.p
                    key="twist"
                    className="rounded-xl bg-amber-100 px-4 py-3 text-center font-semibold text-amber-700"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    Twist: {TWIST} {reached("adapt") && "The team adapts their design."}
                  </motion.p>
                )}
                {reached("score") && (
                  <motion.div
                    key="score"
                    className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={SPRINGS.gentle}
                  >
                    <ScoreRing value={87} size={120} />
                    <div className="max-w-xs text-center sm:text-left">
                      <p className="font-display text-2xl font-bold">Scored on reasoning</p>
                      <p className="text-ink-700">Not on guessing the answer. Then the team leaves with a starter n8n workflow.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Six face-down cards deal into a fan, then the middle one is drawn and flips.
function CardFan({ drawn }: { drawn: boolean }) {
  const cards = [0, 1, 2, 3, 4, 5];
  const drawnIndex = 2;
  return (
    <div className="relative h-80 w-full max-w-xl scale-[0.8] sm:scale-100">
      {cards.map((i) => {
        const spread = i - 2.5;
        const isDrawn = i === drawnIndex;
        return (
          <div key={i} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ zIndex: isDrawn && drawn ? 10 : i }}>
          <motion.div
            initial={{ x: spread * 30, y: -420, rotate: -40, opacity: 0 }}
            animate={
              drawn
                ? isDrawn
                  ? { x: 0, y: -10, rotate: 0, scale: 1.12, opacity: 1 }
                  : { x: spread * 78, y: 60, rotate: spread * 9, scale: 0.8, opacity: 0.35 }
                : { x: spread * 58, y: Math.abs(spread) * 10, rotate: spread * 7 + seededTilt(i, 2), scale: 1, opacity: 1 }
            }
            transition={{ ...SPRINGS.bouncy, delay: drawn ? 0 : i * 0.12 }}
          >
            <GameCard
              title={DEMO_CARD.title}
              story={DEMO_CARD.story}
              cost={DEMO_CARD.cost}
              label="Demo"
              number={1}
              faceDown={!(drawn && isDrawn)}
              size="sm"
            />
          </motion.div>
          </div>
        );
      })}
    </div>
  );
}
