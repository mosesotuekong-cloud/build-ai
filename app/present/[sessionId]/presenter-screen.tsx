"use client";

import { AnimatePresence, motion } from "motion/react";
import { SlotMeter } from "@/components/game/slot-meter";
import { SPRINGS } from "@/components/game/springs";
import { Stamp } from "@/components/game/stamp";
import { LiveRefresh } from "@/components/session/live-refresh";
import { PhaseTimer } from "@/components/session/phase-timer";
import { Wordmark } from "@/components/ui/wordmark";
import { PHASE_LABELS, type Phase } from "@/lib/session/machine";
import { Drumroll, Leaderboard, type BoardRow } from "@/components/present/leaderboard";
import type { Award } from "@/lib/judging/awards";

type PresenterTeam = { id: string; name: string; players: number; filled: Record<string, boolean>; twist: string | null };

export function PresenterScreen({
  session,
  teams,
  joinHost,
  serverNow,
  results,
  pledges,
}: {
  session: { id: string; name: string; phase: string; startedAt: string | null; duration: number | null; joinCode: string | null };
  teams: PresenterTeam[];
  joinHost: string;
  serverNow: string;
  results: { leaderboard: BoardRow[]; awards: Award[]; done: number; total: number } | null;
  pledges: { teamName: string; first_step: string; due_date: string }[];
}) {
  const phase = session.phase as Phase;
  // The big code is for the lobby; once design starts, a small strip lets latecomers join.
  const showCode = ["lobby", "baseline_check"].includes(phase) && session.joinCode;
  const showCodeStrip = phase === "solving" && session.joinCode;
  const showProgress = ["solving", "twist", "solving_after_twist", "prioritise"].includes(phase);
  const showTwists = phase === "twist" || phase === "solving_after_twist";

  return (
    <main className="relative flex min-h-screen flex-col gap-8 overflow-hidden bg-cream-100 px-10 py-8">
      <LiveRefresh sessionId={session.id} teamIds={teams.map((t) => t.id)} watch={["sessions", "teams", "players", "designs", "scores", "commitments"]} throttleMs={3000} />

      <header className="flex items-center justify-between gap-6">
        <Wordmark size="md" />
        {showCodeStrip ? (
          <p className="rounded-full bg-green-600 px-6 py-2 text-xl font-semibold text-cream-50">
            Late? Join at {joinHost}/join with <span className="font-display font-bold tracking-[0.15em]">{session.joinCode}</span>
          </p>
        ) : (
          <p className="font-display text-2xl font-bold text-ink-700">{session.name}</p>
        )}
      </header>

      <AnimatePresence mode="wait">
        <motion.section
          key={phase}
          className="flex flex-1 flex-col items-center justify-center gap-8 text-center"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={SPRINGS.gentle}
        >
          <div className="space-y-3">
            <p className="text-2xl font-bold tracking-[0.3em] text-green-700 uppercase">{PHASE_LABELS[phase].title}</p>
            <PhaseTimer startedAt={session.startedAt} durationSeconds={session.duration} serverNow={serverNow} size="xl" />
          </div>

          {showCode && (
            <div className="rounded-[2.5rem] bg-green-600 px-16 py-10 text-cream-50 shadow-lift">
              <p className="text-3xl font-semibold text-cream-100/90">Join at {joinHost}/join</p>
              <p className="font-display text-[9rem] leading-none font-bold tracking-[0.15em]" aria-label="Join code">
                {session.joinCode}
              </p>
            </div>
          )}

          {phase === "closed" && <p className="font-display text-6xl font-bold">Thanks for playing</p>}
          {phase === "judging" && results && <Drumroll done={results.done} total={results.total} />}
          {(phase === "reveal" || phase === "report") && results && <Leaderboard rows={results.leaderboard} awards={results.awards} />}
          {phase === "commitments" && (
            <ul className="w-full max-w-5xl space-y-3 text-left" aria-label="Pledges">
              {pledges.length === 0 && <li className="text-center text-3xl text-ink-500">Teams are writing their pledges…</li>}
              {pledges.map((p) => (
                <li key={p.teamName} className="rounded-3xl border-2 border-green-600 bg-cream-50 p-5 shadow-card">
                  <p className="font-display text-3xl font-bold">{p.teamName}</p>
                  <p className="text-2xl text-ink-700">{p.first_step}</p>
                  <p className="text-xl text-green-700">By {new Date(p.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</p>
                </li>
              ))}
            </ul>
          )}
          {!showCode && !showProgress && !["closed", "judging", "reveal", "report", "commitments"].includes(phase) && (
            <p className="max-w-3xl text-4xl text-ink-700">{PHASE_LABELS[phase].player}</p>
          )}
        </motion.section>
      </AnimatePresence>

      {(phase === "lobby" || showProgress) && (
        <ul className="grid grid-cols-2 gap-5 lg:grid-cols-4" aria-label="Teams">
          <AnimatePresence initial={false}>
            {teams.map((t) => (
              <motion.li
                key={t.id}
                layout
                initial={{ scale: 0, rotate: -8, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={SPRINGS.bouncy}
                className="space-y-3 rounded-3xl border border-cream-300 bg-cream-50 p-5 shadow-card"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-display text-3xl font-bold">{t.name}</p>
                  <p className="text-lg text-ink-500">
                    {t.players} {t.players === 1 ? "player" : "players"}
                  </p>
                </div>
                {showProgress && <SlotMeter filled={t.filled} />}
                {showTwists && t.twist && <p className="rounded-xl bg-amber-50 p-3 text-lg leading-snug text-ink-900">{t.twist}</p>}
              </motion.li>
            ))}
          </AnimatePresence>
          {phase === "lobby" && teams.length === 0 && <li className="col-span-full text-center text-3xl text-ink-500">Waiting for the first team…</li>}
        </ul>
      )}

      <div className="pointer-events-none absolute inset-0 [&_span]:text-[10rem]">
        <Stamp show={phase === "twist"} text="Twist" />
      </div>
    </main>
  );
}
