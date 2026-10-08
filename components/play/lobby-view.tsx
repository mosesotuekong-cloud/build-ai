"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState, useTransition } from "react";
import { GameCard } from "@/components/game/game-card";
import { SPRINGS, seededTilt } from "@/components/game/springs";
import { PhaseTimer } from "@/components/session/phase-timer";
import { Wordmark } from "@/components/ui/wordmark";
import { functionName } from "@/lib/decks/schemas";
import { pickCase } from "@/app/play/actions";
import { OwnProblemCard } from "./own-problem";
import { RaiseIdeaButton } from "./raise-idea";

export type LobbyCase = { id: string; title: string; story: string; cost: string; who_feels_it: string; function_slug: string; takenBy: string[] };

// The team's lobby: who's here, and (when teams pick) a hand of case cards to
// draw from. Teams can change their pick until design starts.
export function LobbyView({
  teamId,
  teamName,
  teammates,
  phaseMessage,
  canPick,
  pickByFunction,
  cases,
  pickedId,
  timer,
}: {
  teamId: string;
  teamName: string;
  teammates: string[];
  phaseMessage: string;
  canPick: boolean;
  pickByFunction: boolean;
  cases: LobbyCase[];
  pickedId: string | null;
  timer: { startedAt: string | null; duration: number | null; serverNow: string };
}) {
  const functions = useMemo(() => [...new Set(cases.map((c) => c.function_slug))], [cases]);
  const pickedCase = cases.find((c) => c.id === pickedId);
  const [fn, setFn] = useState<string | null>(pickedCase?.function_slug ?? (functions.length === 1 ? functions[0] : null));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const shown = pickByFunction ? cases.filter((c) => c.function_slug === fn) : cases;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6 pb-24">
      <RaiseIdeaButton teamId={teamId} />
      <header className="flex items-center justify-between gap-3">
        <Wordmark size="sm" />
        <PhaseTimer startedAt={timer.startedAt} durationSeconds={timer.duration} serverNow={timer.serverNow} size="sm" />
      </header>

      <section className="space-y-2 rounded-3xl bg-green-600 p-5 text-cream-50 shadow-card">
        <p className="text-sm font-bold tracking-wider text-cream-100/80 uppercase">Your team</p>
        <h1 className="font-display text-4xl font-bold">{teamName}</h1>
        <ul className="flex flex-wrap gap-2" aria-label="Teammates">
          <AnimatePresence initial={false}>
            {teammates.map((name) => (
              <motion.li
                key={name}
                layout
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={SPRINGS.bouncy}
                className="rounded-full bg-cream-50/15 px-3 py-1 text-sm font-semibold"
              >
                {name}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <p className="text-cream-100/90">{phaseMessage}</p>
      </section>

      {canPick ? (
        <section className="space-y-4" aria-label="Pick your case">
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-bold">{pickedCase ? "Your case" : "Draw your case"}</h2>
            <p className="text-ink-500">
              {pickedCase ? "Tap another card to change your mind before design starts." : "Tap the card your team wants to work on."}
            </p>
          </div>
          {pickByFunction && functions.length > 1 && (
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Function">
              {functions.map((slug) => (
                <button
                  key={slug}
                  role="tab"
                  aria-selected={fn === slug}
                  onClick={() => setFn(slug)}
                  className={`rounded-full border-2 px-4 py-2 text-sm font-bold ${fn === slug ? "border-green-600 bg-green-600 text-cream-50" : "border-cream-300 bg-cream-50 text-ink-700"}`}
                >
                  {functionName(slug)}
                </button>
              ))}
            </div>
          )}
          {error && (
            <p className="rounded-xl bg-danger-50 p-3 text-sm text-danger-700" role="alert">
              {error}
            </p>
          )}
          <ul className="flex flex-wrap justify-center gap-5 sm:justify-start">
            {shown.map((c, i) => (
              <li key={c.id} className="space-y-2">
                <GameCard
                  title={c.title}
                  story={c.story}
                  cost={c.cost}
                  whoFeelsIt={c.who_feels_it}
                  label={functionName(c.function_slug)}
                  number={i + 1}
                  tilt={seededTilt(i + 3, 2)}
                  selected={c.id === pickedId}
                  onSelect={
                    pending
                      ? undefined
                      : () =>
                          start(async () => {
                            setError(null);
                            const result = await pickCase(teamId, c.id);
                            if (!result.ok) setError(result.message ?? "That didn't work.");
                          })
                  }
                />
                {c.takenBy.filter((t) => t !== teamName).length > 0 && (
                  <p className="text-center text-xs text-ink-500">Also picked by {c.takenBy.filter((t) => t !== teamName).join(", ")}</p>
                )}
              </li>
            ))}
            {!pickByFunction || functions.length <= 1 || fn ? (
              <li>
                <OwnProblemCard teamId={teamId} />
              </li>
            ) : null}
          </ul>
        </section>
      ) : (
        <section className="rounded-3xl border border-cream-300 bg-cream-50 p-6 text-center shadow-card">
          {pickedCase ? (
            <>
              <p className="text-sm font-bold tracking-wider text-green-700 uppercase">Your case</p>
              <p className="font-display text-2xl font-bold">{pickedCase.title}</p>
            </>
          ) : (
            <p className="text-ink-700">Your facilitator will hand out the cases. Hang tight.</p>
          )}
        </section>
      )}
    </main>
  );
}
