"use client";

import { Fragment, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Connector } from "@/components/game/connector";
import { SlotSocket } from "@/components/game/slot-socket";
import { Stamp } from "@/components/game/stamp";
import { PhaseTimer } from "@/components/session/phase-timer";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";
import { saveCheck } from "@/app/play/discovery-actions";
import { CANVAS_SLOTS, type CanvasSlot } from "@/lib/ai/schemas/canvas";
import type { CheckCard } from "@/lib/checks/cards";
import { SlotEditor } from "./slot-editor";

type Slots = Record<CanvasSlot, string>;

// The solo warm-up and final rounds: one short card, the five slots, on the
// player's own phone. No coach. Locking in ends the round for this player.
export function CheckView({
  teamId,
  kind,
  card,
  initial,
  submitted,
  timer,
}: {
  teamId: string;
  kind: "baseline" | "post";
  card: CheckCard;
  initial: Slots;
  submitted: boolean;
  timer: { startedAt: string | null; duration: number | null; serverNow: string };
}) {
  const [slots, setSlots] = useState<Slots>(initial);
  const [editing, setEditing] = useState<CanvasSlot | null>(null);
  const [locked, setLocked] = useState(submitted);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error" | "ended">("saved");
  const [pending, start] = useTransition();
  const pendingPatch = useRef<Partial<Slots>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    const patch = pendingPatch.current;
    pendingPatch.current = {};
    if (!Object.keys(patch).length) return;
    setSaveState("saving");
    const result = await saveCheck(teamId, kind, patch);
    setSaveState(result.ok ? "saved" : result.message ? "ended" : "error");
  }, [teamId, kind]);

  useEffect(() => () => void flush(), [flush]);

  const update = (slot: CanvasSlot, value: string) => {
    setSlots((s) => ({ ...s, [slot]: value }));
    pendingPatch.current = { ...pendingPatch.current, [slot]: value };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, 500);
  };

  const filled = CANVAS_SLOTS.filter((s) => slots[s].trim()).length;
  const round = kind === "baseline" ? "Warm-up round" : "Final round";

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 py-5">
      <header className="flex items-center justify-between gap-3">
        <Wordmark size="sm" />
        <PhaseTimer startedAt={timer.startedAt} durationSeconds={timer.duration} serverNow={timer.serverNow} size="sm" />
      </header>

      <section className="space-y-1">
        <p className="text-sm font-bold tracking-wider text-green-700 uppercase">{round} · just you</p>
        <p className="text-ink-700">
          {kind === "baseline"
            ? "Four minutes on your own, before the game. Do your best; it shows how much you learn today."
            : "One more on your own. A different problem, the same difficulty as your warm-up."}
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-cream-300 bg-cream-50 shadow-card">
        <div className="bg-green-600 px-4 py-2 text-xs font-bold tracking-wider text-cream-50 uppercase">{card.area}</div>
        <div className="space-y-2 p-4">
          <h1 className="font-display text-2xl font-bold">{card.title}</h1>
          <p className="leading-relaxed text-ink-700">{card.story}</p>
        </div>
      </section>

      <section className="relative space-y-3" aria-label="Your answer">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold">Your five slots</h2>
          <span className="text-sm text-ink-500" role="status">
            {locked
              ? "Locked in"
              : saveState === "saving"
                ? "Saving…"
                : saveState === "ended"
                  ? "Time's up. Moving on…"
                  : saveState === "error"
                    ? "Couldn't save. Check your connection."
                    : `${filled} of 5 filled`}
          </span>
        </div>
        <div className="flex flex-col">
          {CANVAS_SLOTS.map((slot, i) => (
            <Fragment key={slot}>
              {i > 0 && (
                <div className="flex justify-center">
                  <Connector lit={Boolean(slots[CANVAS_SLOTS[i - 1]].trim() && slots[slot].trim())} tone={slot === "human" ? "amber" : "green"} direction="vertical" />
                </div>
              )}
              <button
                type="button"
                disabled={locked}
                onClick={() => setEditing(slot)}
                className="block w-full rounded-2xl text-left"
                aria-label={`Edit ${slot === "human" ? "human in control" : slot}`}
              >
                <SlotSocket slot={slot} value={slots[slot]} compact />
              </button>
            </Fragment>
          ))}
        </div>
        <Stamp show={locked} text="Locked in" tone="green" />
      </section>

      {locked ? (
        <p className="rounded-2xl bg-green-50 p-4 text-center font-semibold text-green-700">Done. Wait for your facilitator to start the next part.</p>
      ) : (
        <Button
          className="w-full text-lg"
          disabled={pending || filled === 0}
          onClick={() =>
            start(async () => {
              if (timerRef.current) clearTimeout(timerRef.current);
              const patch = { ...pendingPatch.current };
              pendingPatch.current = {};
              const result = await saveCheck(teamId, kind, patch, true);
              if (result.ok) setLocked(true);
              else setSaveState("error");
            })
          }
        >
          {pending ? "Locking in…" : "Lock it in"}
        </Button>
      )}

      <SlotEditor
        slot={editing}
        value={editing ? slots[editing] : ""}
        onSave={(slot, value) => {
          update(slot, value);
          setEditing(null);
        }}
        onAskCoach={() => setEditing(null)}
        hideCoach
        onClose={() => setEditing(null)}
      />
    </main>
  );
}
