"use client";

import { useState, useTransition } from "react";
import { SlotMeter } from "@/components/game/slot-meter";
import { SlotSocket } from "@/components/game/slot-socket";
import { TokenCoins } from "@/components/game/token-coins";
import { LiveRefresh } from "@/components/session/live-refresh";
import { PhaseTimer } from "@/components/session/phase-timer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CANVAS_SLOTS } from "@/lib/ai/schemas/canvas";
import type { CoachDesign } from "@/lib/coach/context";
import { functionName } from "@/lib/decks/schemas";
import { FREQUENCIES, READINESS, RISK_LEVELS, portfolioBucket, scorecardProgress, type Scorecard } from "@/lib/discovery/scorecard";
import { nextPhase, PHASE_LABELS, type Phase } from "@/lib/session/machine";
import type { SessionSettings } from "@/lib/session/settings";
import { addTime, advanceToNext, assignCase, deleteDraft, endSession } from "../actions";
import { ResultsPanel, type CheckSummary, type CommitmentRow } from "@/components/console/results-panel";
import type { Award } from "@/lib/judging/awards";
import type { TeamScore } from "@/lib/judging/load";

export type RunTeam = {
  id: string;
  name: string;
  caseId: string | null;
  tokens: number;
  twist: string | null;
  checks: { id: string; flags: { slot: string; kind: string; question: string }[]; created_at: string }[];
  players: string[];
  design: CoachDesign | null;
  filled: Record<string, boolean>;
  scorecard: Scorecard | null;
  messages: { id: string; role: "team" | "coach"; type: string | null; slot: string | null; content: string; inline: boolean; earned: boolean }[];
};

export type RunIdea = {
  id: string;
  title: string;
  what_happens: string;
  who_feels_it: string;
  frequency: string | null;
  status: "raised" | "designed";
  teamName: string | null;
};

type RunSession = {
  id: string;
  name: string;
  phase: string;
  phaseStartedAt: string | null;
  phaseDuration: number | null;
  joinCode: string | null;
  deckName: string;
  settings: SessionSettings;
};

function phasePath(settings: SessionSettings): Phase[] {
  const path: Phase[] = ["draft"];
  let p: Phase | null = "draft";
  while ((p = nextPhase(p, settings))) path.push(p);
  return path;
}

export function RunConsole({
  session,
  teams,
  cases,
  credits,
  serverNow,
  joinHost,
  ideas,
  checks,
  results,
}: {
  session: RunSession;
  teams: RunTeam[];
  cases: { id: string; title: string; function_slug: string }[];
  credits: number;
  serverNow: string;
  joinHost: string;
  ideas: RunIdea[];
  checks: { baseline: number; post: number };
  results: { scores: TeamScore[]; awards: Award[]; pending: number; failed: number; checks: CheckSummary[]; commitments: CommitmentRow[] };
}) {
  const phase = session.phase as Phase;
  const next = nextPhase(phase, session.settings);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedTeam = teams.find((t) => t.id === selected) ?? null;
  const path = phasePath(session.settings);
  const caseTitle = (id: string | null) => cases.find((c) => c.id === id)?.title ?? null;
  const canAssign = ["draft", "lobby", "baseline_check"].includes(phase);

  const run = (fn: () => Promise<{ ok: boolean; message?: string } | void>) =>
    start(async () => {
      setMessage(null);
      const result = await fn();
      if (result && !result.ok) setMessage(result.message ?? "That didn't work.");
    });

  return (
    <div className="space-y-6">
      <LiveRefresh sessionId={session.id} teamIds={teams.map((t) => t.id)} watch={["sessions", "teams", "players", "designs", "coach_messages", "ideas", "checks", "scores", "commitments"]} />

      <Card className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-bold">{session.name}</h1>
            <p className="text-ink-500">
              {session.deckName} · {teams.length} {teams.length === 1 ? "team" : "teams"} · {teams.reduce((n, t) => n + t.players.length, 0)} players
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PhaseTimer startedAt={session.phaseStartedAt} durationSeconds={session.phaseDuration} serverNow={serverNow} />
            {phase !== "draft" && (
              <a href={`/present/${session.id}`} target="_blank" rel="noreferrer" className="rounded-xl border-2 border-green-600 px-4 py-2 font-semibold text-green-700 hover:bg-green-50">
                Presenter screen ↗
              </a>
            )}
          </div>
        </div>

        {/* Phase stepper */}
        <ol className="flex flex-wrap gap-1.5" aria-label="Session phases">
          {path.map((p) => {
            const index = path.indexOf(p);
            const current = path.indexOf(phase);
            const state = p === phase ? "now" : index < current ? "done" : "later";
            return (
              <li
                key={p}
                aria-current={state === "now" ? "step" : undefined}
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  state === "now" ? "bg-green-600 text-cream-50" : state === "done" ? "bg-green-50 text-green-700" : "bg-cream-200 text-ink-500"
                }`}
              >
                {PHASE_LABELS[p].title}
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap items-center gap-3">
          {next && (
            <Button disabled={pending} onClick={() => run(() => advanceToNext(session.id))}>
              {pending ? "Moving on…" : phase === "draft" ? `Open the lobby (uses 1 of ${credits} credits)` : `Start: ${PHASE_LABELS[next].title}`}
            </Button>
          )}
          {session.phaseDuration && (
            <Button variant="secondary" disabled={pending} onClick={() => run(() => addTime(session.id, 2))}>
              +2 minutes
            </Button>
          )}
          {phase === "draft" ? (
            <Button variant="ghost" className="text-danger-700 hover:bg-danger-50" disabled={pending} onClick={() => confirm("Delete this draft?") && run(() => deleteDraft(session.id))}>
              Delete draft
            </Button>
          ) : (
            phase !== "closed" && (
              <Button variant="ghost" className="text-danger-700 hover:bg-danger-50" disabled={pending} onClick={() => confirm("End the session for everyone now?") && run(() => endSession(session.id))}>
                End session
              </Button>
            )
          )}
          {message && (
            <span className="text-sm text-danger-700" role="alert">
              {message}
            </span>
          )}
        </div>
        {(phase === "baseline_check" || phase === "post_check") && (
          <p className="rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-700" role="status">
            {phase === "baseline_check" ? checks.baseline : checks.post} of {teams.reduce((n, t) => n + t.players.length, 0)} players have locked in their{" "}
            {phase === "baseline_check" ? "warm-up" : "final"} round.
          </p>
        )}
        {(phase === "report" || phase === "closed") && (
          <a
            href={`/console/sessions/${session.id}/report`}
            className="flex items-center justify-between gap-3 rounded-xl border-2 border-green-600 bg-green-50 p-3 font-semibold text-green-700 hover:bg-green-100"
          >
            <span>Open the opportunity map: read it here or download it as a PDF.</span>
            <span aria-hidden>→</span>
          </a>
        )}
      </Card>

      {phase !== "draft" && phase !== "closed" && session.joinCode && (
        <Card className="flex flex-wrap items-center justify-between gap-4 bg-green-600 text-cream-50">
          <div>
            <p className="text-sm font-semibold text-cream-100/80">Players join at {joinHost}/join with code</p>
            <p className="font-display text-5xl font-bold tracking-[0.2em]" aria-label="Join code">
              {session.joinCode}
            </p>
          </div>
          <p className="max-w-sm text-sm text-cream-100/90">Show the presenter screen on the projector so everyone can see the code and the timer.</p>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-bold">Teams</h2>
        {teams.length === 0 ? (
          <Card className="text-center text-ink-500">{phase === "draft" ? "Open the lobby to let teams join." : "Waiting for the first team to join…"}</Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((t) => (
              <li key={t.id}>
                <div
                  className={`space-y-3 rounded-2xl border-2 bg-cream-50 p-4 shadow-card ${selected === t.id ? "border-green-600" : "border-cream-300"}`}
                >
                  <button type="button" onClick={() => setSelected(selected === t.id ? null : t.id)} className="w-full space-y-3 text-left">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-xl font-bold">{t.name}</h3>
                      <TokenCoins count={t.tokens} size="sm" />
                    </div>
                    <p className="text-sm text-ink-500">{t.players.join(", ") || "No players yet"}</p>
                    <p className="text-sm font-semibold text-green-700">{caseTitle(t.caseId) ?? "No case yet"}</p>
                    {t.twist && <p className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-700">Twist: {t.twist}</p>}
                    <SlotMeter filled={t.filled} size="sm" />
                    <p className="text-xs text-ink-500">
                      {t.messages.filter((m) => m.role === "team").length} coach questions · {selected === t.id ? "Hide details" : "View design and coach chat"}
                    </p>
                  </button>
                  {canAssign && (
                    <select
                      aria-label={`Case for ${t.name}`}
                      value={t.caseId ?? ""}
                      onChange={(e) => e.target.value && run(() => assignCase(session.id, t.id, e.target.value))}
                      className="w-full rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">{session.settings.case_mode === "teams_pick" ? "Team will pick (or assign)" : "Assign a case"}</option>
                      {cases.map((c) => (
                        <option key={c.id} value={c.id}>
                          {functionName(c.function_slug)}: {c.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedTeam && <TeamDetail team={selectedTeam} caseTitle={caseTitle(selectedTeam.caseId)} />}

      {["prioritise", "judging", "reveal", "post_check", "commitments", "report", "closed"].includes(phase) && (
        <ResultsPanel
          sessionId={session.id}
          scores={results.scores}
          scorecards={Object.fromEntries(teams.map((t) => [t.id, t.scorecard]))}
          awards={results.awards}
          pending={results.pending}
          failed={results.failed}
          checks={results.checks}
          commitments={results.commitments}
        />
      )}

      <IdeasList ideas={ideas} />
    </div>
  );
}

// Problems players raised from their own work: the start of the backlog.
function IdeasList({ ideas }: { ideas: RunIdea[] }) {
  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
        <h2 className="font-display text-2xl font-bold">Problems raised by staff</h2>
        <p className="text-sm text-ink-500">Players can raise problems from their own work at any time. They all go into the opportunity map.</p>
      </div>
      {ideas.length === 0 ? (
        <Card className="text-sm text-ink-500">Nothing raised yet.</Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {ideas.map((idea) => (
            <li key={idea.id} className="space-y-1 rounded-2xl border border-cream-300 bg-cream-50 p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-lg font-bold">{idea.title}</p>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${idea.status === "designed" ? "bg-green-600 text-cream-50" : "bg-amber-100 text-amber-700"}`}
                >
                  {idea.status === "designed" ? "Being designed" : "Raised"}
                </span>
              </div>
              <p className="text-sm text-ink-700">{idea.what_happens}</p>
              <p className="text-xs text-ink-500">
                {[
                  idea.teamName && `From ${idea.teamName}`,
                  idea.who_feels_it && `Who feels it: ${idea.who_feels_it}`,
                  idea.frequency && FREQUENCIES.find((f) => f.value === idea.frequency)?.label,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const BUCKET_NAMES = { quick_win: "Quick win", strategic_bet: "Strategic bet", fix_data: "Fix the data first", park: "Park" } as const;

// The team's own discovery scorecard, in plain words.
function ScorecardSummary({ card }: { card: Scorecard }) {
  const progress = scorecardProgress(card);
  if (progress.done === 0) return <p className="text-sm text-ink-500">The team hasn&apos;t rated this yet.</p>;
  const label = (list: readonly { value: string; label: string }[], v: string | null) => list.find((o) => o.value === v)?.label ?? "Not answered";
  const bucket = portfolioBucket(card);
  return (
    <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
      <Row term="Value" value={card.impact ? `${card.impact} of 5` : "Not answered"} />
      <Row term="Ready?" value={label(READINESS, card.readiness)} />
      <Row term="Risk" value={label(RISK_LEVELS, card.risk_level)} />
      <Row term="Portfolio" value={bucket ? BUCKET_NAMES[bucket] : "Not enough answers"} />
    </dl>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-cream-200 py-1">
      <dt className="text-ink-500">{term}</dt>
      <dd className="text-right font-semibold text-ink-900">{value}</dd>
    </div>
  );
}

// The facilitator's live view of one team: their design and their coach chat.
function TeamDetail({ team, caseTitle }: { team: RunTeam; caseTitle: string | null }) {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]" aria-label={`${team.name} in detail`}>
      <Card className="space-y-4">
        <div>
          <h2 className="font-display text-2xl font-bold">{team.name}</h2>
          <p className="text-sm text-ink-500">{caseTitle ?? "No case yet"}</p>
        </div>
        {team.design ? (
          <div className="space-y-2">
            {CANVAS_SLOTS.map((slot) => (
              <SlotSocket key={slot} slot={slot} value={team.design![slot]} oversight={team.design!.oversight} compact />
            ))}
            <p className="text-sm text-ink-500">
              {team.design.name ? `“${team.design.name}” · ` : ""}
              {team.design.hours_saved_per_month !== null ? `${team.design.hours_saved_per_month} hours a month · ` : ""}
              Tools: {team.design.tools.join(", ") || "none"} · Systems: {team.design.systems.join(", ") || "none"}
            </p>
          </div>
        ) : (
          <p className="text-ink-500">No design yet.</p>
        )}
        {team.checks.length > 0 && (
          <div className="space-y-2 border-t border-cream-200 pt-4">
            <h3 className="font-display text-lg font-bold">Design checks ({team.checks.length})</h3>
            <ul className="space-y-1.5 text-sm">
              {team.checks.flatMap((c) =>
                c.flags.length
                  ? c.flags.map((f, i) => (
                      <li key={`${c.id}-${i}`} className="text-ink-700">
                        <span className="font-bold text-amber-700 uppercase">{f.slot}</span> · {f.question}
                      </li>
                    ))
                  : [
                      <li key={c.id} className="text-ink-500">
                        No hard errors found.
                      </li>,
                    ],
              )}
            </ul>
          </div>
        )}
        {team.scorecard && (
          <div className="space-y-2 border-t border-cream-200 pt-4">
            <h3 className="font-display text-lg font-bold">Their discovery scorecard</h3>
            <ScorecardSummary card={team.scorecard} />
          </div>
        )}
      </Card>
      <Card className="max-h-[36rem] space-y-3 overflow-y-auto">
        <h3 className="font-display text-lg font-bold">Coach chat</h3>
        {team.messages.length === 0 && <p className="text-sm text-ink-500">This team hasn&apos;t asked the coach anything yet.</p>}
        {team.messages.map((m) => (
          <div key={m.id} className={m.role === "team" ? "ml-6 rounded-2xl bg-green-600 px-3 py-2 text-sm text-cream-50" : "mr-6 rounded-2xl border border-cream-300 bg-white px-3 py-2 text-sm"}>
            {m.role === "coach" && m.type && <span className="mr-1.5 text-[11px] font-bold text-amber-700 uppercase">{m.inline ? "inline" : m.type}</span>}
            {m.earned && <span className="mr-1.5 rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-ink-900">coin earned</span>}
            {m.content}
          </div>
        ))}
      </Card>
    </section>
  );
}
