"use client";

import { Fragment, useState } from "react";
import { Connector } from "@/components/game/connector";
import { GameCard } from "@/components/game/game-card";
import { ScoreRing } from "@/components/game/score-ring";
import { SlotMeter } from "@/components/game/slot-meter";
import { SlotSocket } from "@/components/game/slot-socket";
import { seededTilt } from "@/components/game/springs";
import { Stamp, useShake } from "@/components/game/stamp";
import { TokenCoins } from "@/components/game/token-coins";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CANVAS_SLOTS, type CanvasSlot } from "@/lib/ai/schemas/canvas";
import { HR_DEFAULT_CASES } from "@/lib/decks/hr-default";

const SAMPLE: Record<CanvasSlot, string> = {
  trigger: "Candidate submits the application form",
  steps: "CV text is read and tidied up",
  decision: "AI scores the CV against the job",
  action: "Invite, recruiter review or polite decline is sent",
  human: "Recruiter decides on every 50–69 score",
};

export function GameKit() {
  const [faceDown, setFaceDown] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [filled, setFilled] = useState(0);
  const [tokens, setTokens] = useState(3);
  const [stamp, setStamp] = useState<string | null>(null);
  const [score, setScore] = useState(87);
  const [boardRef, shake] = useShake();

  const slam = (text: string) => {
    setStamp(text);
    void shake({ vibrate: true });
    setTimeout(() => setStamp(null), 1800);
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <Header title="Cards" text="Case studies as game cards. Hover to lift, tap to select, flip to reveal." />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setFaceDown((f) => !f)}>
            {faceDown ? "Flip face up" : "Flip face down"}
          </Button>
        </div>
        <div className="flex gap-4 overflow-x-auto pt-4 pb-6">
          {HR_DEFAULT_CASES.slice(0, 4).map((c, i) => (
            <GameCard
              key={c.title}
              title={c.title}
              story={c.story}
              cost={c.cost}
              whoFeelsIt={c.who_feels_it}
              label="HR"
              number={i + 1}
              faceDown={faceDown}
              tilt={seededTilt(i + 1, 3)}
              selected={selected === i}
              onSelect={() => setSelected(i)}
            />
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <Header title="Slots, connectors and stamps" text="Filling a slot snaps a tile in and lights the connector. Amber is reserved for the human." />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setFilled((n) => Math.min(5, n + 1))} disabled={filled === 5}>
            Fill next slot
          </Button>
          <Button variant="ghost" onClick={() => setFilled(0)}>
            Clear
          </Button>
          <Button variant="secondary" onClick={() => slam("Twist")}>
            Twist stamp
          </Button>
          <Button variant="secondary" onClick={() => slam("Locked in")}>
            Lock it in
          </Button>
        </div>
        <div ref={boardRef} className="relative">
          <div className="flex flex-col lg:flex-row">
            {CANVAS_SLOTS.map((slot, i) => (
              <Fragment key={slot}>
                {i > 0 && (
                  <div className="flex justify-center lg:items-center">
                    <span className="lg:hidden">
                      <Connector lit={filled > i} tone={slot === "human" ? "amber" : "green"} direction="vertical" />
                    </span>
                    <span className="hidden lg:flex">
                      <Connector lit={filled > i} tone={slot === "human" ? "amber" : "green"} />
                    </span>
                  </div>
                )}
                <SlotSocket slot={slot} value={i < filled ? SAMPLE[slot] : undefined} active={i === filled} compact className="flex-1" />
              </Fragment>
            ))}
          </div>
          <Stamp show={stamp !== null} text={stamp ?? ""} tone={stamp === "Locked in" ? "green" : "amber"} />
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="space-y-4">
          <Header title="Hint tokens" text="Spend flips a coin away. The twist drops a bonus coin in." />
          <TokenCoins count={tokens} />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setTokens((t) => Math.max(0, t - 1))} disabled={tokens === 0}>
              Spend
            </Button>
            <Button variant="ghost" onClick={() => setTokens((t) => t + 1)}>
              Bonus
            </Button>
          </div>
        </Card>

        <Card className="space-y-4">
          <Header title="Progress meter" text="What the presenter screen shows: which slots are filled, never their content." />
          <SlotMeter filled={Object.fromEntries(CANVAS_SLOTS.map((s, i) => [s, i < filled]))} />
          <SlotMeter size="sm" filled={{ trigger: true, decision: true, human: true }} />
        </Card>

        <Card className="flex flex-col items-center gap-4">
          <Header title="Score ring" text="Counts up, then settles with a wobble." />
          <ScoreRing value={score} size={140} />
          <Button variant="secondary" onClick={() => setScore(40 + Math.floor(Math.random() * 60))}>
            New score
          </Button>
        </Card>
      </div>
    </div>
  );
}

function Header({ title, text }: { title: string; text: string }) {
  return (
    <div className="w-full space-y-1">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="text-sm text-ink-500">{text}</p>
    </div>
  );
}
