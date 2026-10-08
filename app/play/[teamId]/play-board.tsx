"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { CoachPanel, type ChatMessage } from "@/components/play/coach-panel";
import { Results } from "@/components/play/results";
import { SlotEditor } from "@/components/play/slot-editor";
import { Connector } from "@/components/game/connector";
import { SlotSocket } from "@/components/game/slot-socket";
import { Stamp, useShake } from "@/components/game/stamp";
import { TokenCoins } from "@/components/game/token-coins";
import { PhaseTimer } from "@/components/session/phase-timer";
import { useTeamDesignSync } from "@/components/play/use-team-design-sync";
import { RaiseIdeaButton } from "@/components/play/raise-idea";
import { Button } from "@/components/ui/button";
import { ChipSelect } from "@/components/ui/chip-select";
import { Wordmark } from "@/components/ui/wordmark";
import { CANVAS_SLOTS, type CanvasSlot } from "@/lib/ai/schemas/canvas";
import type { ReferenceSolution, ScoredCriterion } from "@/lib/ai/schemas/judge";
import type { CoachCase, CoachDesign } from "@/lib/coach/context";
import { finishPractice, reopenPractice, saveDesign } from "../actions";

type Finished = { score: { total: number; breakdown: ScoredCriterion[]; summary: string } | null; reference: ReferenceSolution | null };

export function PlayBoard({
  teamId,
  mode,
  phase,
  teamName,
  timer: phaseTimer,
  coachEnabled,
  caseInfo,
  initialDesign,
  initialTokens,
  platforms,
  history,
  initialFinished,
  toolSuggestions,
  systemSuggestions,
}: {
  teamId: string;
  mode: "live" | "practice";
  phase: string;
  teamName: string;
  timer: { startedAt: string | null; duration: number | null; serverNow: string };
  coachEnabled: boolean;
  caseInfo: CoachCase;
  initialDesign: CoachDesign;
  initialTokens: number;
  platforms: string[];
  history: ChatMessage[];
  initialFinished: Finished | null;
  toolSuggestions: string[];
  systemSuggestions: string[];
}) {
  const [design, setDesign] = useState<CoachDesign>(initialDesign);
  const [tokens, setTokens] = useState(initialTokens);
  const [editing, setEditing] = useState<CanvasSlot | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [finished, setFinished] = useState<Finished | null>(initialFinished);
  const [finishing, startFinish] = useTransition();
  const [stamp, setStamp] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachDraft, setCoachDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(history);
  const [boardRef, shake] = useShake();
  const pending = useRef<Partial<CoachDesign>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dirty, setDirty] = useState<ReadonlySet<string>>(new Set());
  const readOnly = mode === "live" && phase === "twist";

  // Teammates edit the same design on their own phones. When fresh data
  // arrives from the server, take it, except for fields this phone is still
  // saving. Tokens follow the server too (for example the twist bonus).
  const [seen, setSeen] = useState({ design: initialDesign, tokens: initialTokens });
  if (seen.design !== initialDesign || seen.tokens !== initialTokens) {
    setSeen({ design: initialDesign, tokens: initialTokens });
    setTokens(initialTokens);
    setDesign((current) => {
      const merged: CoachDesign = { ...initialDesign };
      for (const key of dirty) (merged as Record<string, unknown>)[key] = current[key as keyof CoachDesign];
      return merged;
    });
  }

  // Autosave: collect changes and send them after a short pause.
  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    setSaveState("saving");
    const result = await saveDesign(teamId, patch);
    setSaveState(result.ok ? "saved" : "error");
    setDirty((d) => new Set([...d].filter((k) => !(k in patch) || k in pending.current)));
  }, [teamId]);

  const update = useCallback(
    (patch: Partial<CoachDesign>) => {
      setDesign((d) => ({ ...d, ...patch }));
      pending.current = { ...pending.current, ...patch };
      setDirty((d) => new Set([...d, ...Object.keys(patch)]));
      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 700);
    },
    [flush],
  );

  useEffect(() => () => void flush(), [flush]);

  // Teammates' edits arrive live; keep any field this phone hasn't saved yet.
  const onRemoteDesign = useCallback((remote: Partial<CoachDesign>) => {
    const keep = { ...pending.current };
    setDesign((current) => ({ ...current, ...remote, ...Object.fromEntries(Object.keys(keep).map((k) => [k, current[k as keyof CoachDesign]])) }));
  }, []);
  useTeamDesignSync(teamId, phase === "solving_after_twist" ? "after_twist" : "before_twist", onRemoteDesign);

  const filled = CANVAS_SLOTS.filter((s) => design[s].trim()).length;

  const finish = () => {
    startFinish(async () => {
      if (timer.current) clearTimeout(timer.current);
      await flush();
      setStamp(true);
      void shake();
      const result = await finishPractice(teamId);
      setStamp(false);
      if (result.ok) {
        setFinished({ score: result.score, reference: result.reference });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  const askAboutSlot = (slot: CanvasSlot) => {
    setEditing(null);
    setCoachDraft(`Help us think about our ${slot === "human" ? "human in control" : slot} slot.`);
    setCoachOpen(true);
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-cream-200 bg-cream-100/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {mode === "practice" ? (
              <Link href="/console/decks" className="shrink-0 text-sm font-semibold text-green-700 hover:underline">
                ← Decks
              </Link>
            ) : (
              <Wordmark size="sm" />
            )}
            <span className="hidden truncate rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 uppercase sm:inline">
              {mode === "practice" ? "Practice run" : teamName}
            </span>
            {mode === "live" && <PhaseTimer startedAt={phaseTimer.startedAt} durationSeconds={phaseTimer.duration} serverNow={phaseTimer.serverNow} size="sm" />}
          </div>
          <div className="flex items-center gap-3">
            <TokenCoins count={tokens} size="sm" label="Hint coins" />
            {mode === "practice" && !finished && (
              <Button onClick={finish} disabled={finishing || filled === 0} className="px-4 py-2 text-sm">
                {finishing ? "Scoring…" : "Finish"}
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <main className="min-w-0 space-y-6">
          <CaseStrip caseInfo={caseInfo} />

          <AnimatePresence mode="wait">
            {finished ? (
              <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Results
                  design={design}
                  score={finished.score}
                  reference={finished.reference}
                  platforms={platforms}
                  onKeepGoing={async () => {
                    await reopenPractice(teamId);
                    setFinished(null);
                  }}
                />
              </motion.div>
            ) : (
              <motion.section key="canvas" ref={boardRef} className="relative space-y-6" exit={{ opacity: 0 }} aria-label="Your design">
                {readOnly && (
                  <p className="rounded-2xl bg-amber-100 p-4 font-semibold text-amber-700" role="status">
                    Twist! Something has changed for your team. Listen to your facilitator, then adapt your design when the next round
                    starts. You&apos;ve got a bonus coin.
                  </p>
                )}
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-2xl font-bold">Your design</h2>
                  <span className="text-sm text-ink-500" role="status">
                    {saveState === "saving" ? "Saving…" : saveState === "error" ? "Couldn't save. Check your connection." : `${filled} of 5 slots filled · Saved`}
                  </span>
                </div>

                <div className="flex flex-col">
                  {CANVAS_SLOTS.map((slot, i) => (
                    <Fragment key={slot}>
                      {i > 0 && (
                        <div className="flex justify-center">
                          <Connector lit={Boolean(design[CANVAS_SLOTS[i - 1]].trim() && design[slot].trim())} tone={slot === "human" ? "amber" : "green"} direction="vertical" />
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => setEditing(slot)}
                        className="block w-full rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-600"
                        aria-label={`Edit ${slot === "human" ? "human in control" : slot}`}
                      >
                        <SlotSocket slot={slot} value={design[slot]} compact active={editing === slot} />
                      </button>
                    </Fragment>
                  ))}
                </div>

                <fieldset disabled={readOnly} className={readOnly ? "pointer-events-none opacity-60" : ""}>
                  <Extras design={design} onChange={update} toolSuggestions={toolSuggestions} systemSuggestions={systemSuggestions} />
                </fieldset>
                <Stamp show={stamp} text="Locked in" tone="green" />
                <Stamp show={readOnly} text="Twist" />
              </motion.section>
            )}
          </AnimatePresence>
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-20 h-[calc(100vh-7rem)]">
            <CoachPanel
              teamId={teamId}
              messages={messages}
              onMessages={setMessages}
              disabled={Boolean(finished) || !coachEnabled}
              tokens={tokens}
              onTokens={setTokens}
              draft={coachDraft}
              onDraft={setCoachDraft}
            />
          </div>
        </aside>
      </div>

      {mode === "live" && <RaiseIdeaButton teamId={teamId} offsetForCoach={coachEnabled} />}

      {/* Phone: the coach opens as a sheet. */}
      {!finished && coachEnabled && (
        <button
          type="button"
          onClick={() => setCoachOpen(true)}
          className="fixed right-4 bottom-4 z-30 flex items-center gap-2 rounded-full bg-green-600 px-5 py-3 font-bold text-cream-50 shadow-lift lg:hidden"
        >
          <span aria-hidden>?</span> Coach
        </button>
      )}
      <AnimatePresence>
        {coachOpen && (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col bg-ink-900/40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setCoachOpen(false)}
          >
            <motion.div
              className="mt-auto h-[85vh] rounded-t-3xl bg-cream-100 p-3"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
            >
              <CoachPanel
                teamId={teamId}
                messages={messages}
                onMessages={setMessages}
                disabled={Boolean(finished) || !coachEnabled}
                tokens={tokens}
                onTokens={setTokens}
                draft={coachDraft}
                onDraft={setCoachDraft}
                onClose={() => setCoachOpen(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SlotEditor
        slot={editing}
        value={editing ? design[editing] : ""}
        onSave={(slot, value) => {
          update({ [slot]: value } as Partial<CoachDesign>);
          setEditing(null);
        }}
        onAskCoach={askAboutSlot}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function CaseStrip({ caseInfo }: { caseInfo: CoachCase }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="overflow-hidden rounded-2xl border border-cream-300 bg-cream-50 shadow-card" aria-label="Your case">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 bg-green-600 px-4 py-2.5 text-left text-cream-50">
        <span className="text-xs font-bold tracking-wider uppercase">Your case · {caseInfo.function_name}</span>
        <span className="text-sm font-semibold">{open ? "Hide" : "Show"}</span>
      </button>
      <div className="space-y-2 p-4">
        <h1 className="font-display text-2xl leading-tight font-bold">{caseInfo.title}</h1>
        {open && (
          <>
            <p className="leading-relaxed text-ink-700">{caseInfo.story}</p>
            {caseInfo.cost && <p className="font-semibold text-green-700">{caseInfo.cost}</p>}
            {caseInfo.who_feels_it && <p className="text-sm text-ink-500">Who feels it: {caseInfo.who_feels_it}</p>}
          </>
        )}
      </div>
    </section>
  );
}

function Extras({
  design,
  onChange,
  toolSuggestions,
  systemSuggestions,
}: {
  design: CoachDesign;
  onChange: (patch: Partial<CoachDesign>) => void;
  toolSuggestions: string[];
  systemSuggestions: string[];
}) {
  const input =
    "w-full rounded-xl border border-cream-300 bg-white px-3 py-2.5 text-base outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100";
  return (
    <div className="grid gap-4 rounded-2xl border border-cream-300 bg-cream-50 p-4 sm:grid-cols-2">
      <label className="space-y-1.5 sm:col-span-2">
        <span className="text-sm font-semibold text-ink-700">Name your automation</span>
        <input className={input} value={design.name} maxLength={80} placeholder="For example: Leave in a minute" onChange={(e) => onChange({ name: e.target.value })} />
      </label>
      <label className="space-y-1.5">
        <span className="text-sm font-semibold text-ink-700">Hours saved per month (rough guess)</span>
        <input
          className={input}
          type="number"
          min={0}
          max={10000}
          inputMode="decimal"
          value={design.hours_saved_per_month ?? ""}
          onChange={(e) => onChange({ hours_saved_per_month: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
        />
      </label>
      <div className="sm:col-span-2">
        <ChipSelect
          label="Tools you'd build it with"
          hint="The automation or AI platforms you'd use. Pick from the list or type your own."
          value={design.tools}
          onChange={(tools) => onChange({ tools })}
          suggestions={toolSuggestions}
          maxLength={40}
        />
      </div>
      <div className="sm:col-span-2">
        <ChipSelect
          label="Systems involved"
          hint="Where the data lives or the work happens today. The coach will ask about access and privacy for each."
          value={design.systems}
          onChange={(systems) => onChange({ systems })}
          suggestions={systemSuggestions}
        />
      </div>
    </div>
  );
}
