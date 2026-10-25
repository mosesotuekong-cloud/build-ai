"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { chooseChallenge, suggestChallengesFor, triageWeek } from "@/app/discover/actions";
import { GameCard } from "@/components/game/game-card";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import type { TriagedTask } from "@/lib/ai/schemas/discovery";
import { functionLabel, type Challenge, type Discovery } from "@/lib/discover/model";

type Mode = "own" | "pick" | "week";

const TASK_COLUMNS = [
  { label: "automate", title: "Automate", blurb: "A workflow can do most of it.", tone: "border-green-600 bg-green-50" },
  { label: "assist", title: "AI assists", blurb: "A person leads, AI speeds it up.", tone: "border-amber-400 bg-amber-50" },
  { label: "human", title: "Keep human", blurb: "Judgement, care or accountability.", tone: "border-cream-300 bg-cream-100" },
] as const;

// Step two: the challenge. Three ways in: write your own; let the AI suggest
// three for the function; or start from the team's week and let the AI sort
// it. Either way, the cards are dealt next.
export function ChallengeStep({ discovery, onDone }: { discovery: Discovery; onDone: () => void }) {
  const [mode, setMode] = useState<Mode>(discovery.tasks?.length ? "week" : discovery.suggestions?.length ? "pick" : "own");
  const [suggestions, setSuggestions] = useState<Challenge[]>(discovery.suggestions ?? []);
  const [tasks, setTasks] = useState<TriagedTask[]>(discovery.tasks ?? []);
  const [week, setWeek] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [own, setOwn] = useState({ title: "", story: "", cost: "", who_feels_it: "" });
  const [scripted, setScripted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();
  const fn = functionLabel(discovery.function_slug);

  const switchTo = (next: Mode) => {
    setError(null);
    setPicked(null);
    setMode(next);
  };

  const suggest = () =>
    startLoading(async () => {
      setError(null);
      const r = await suggestChallengesFor(discovery.id);
      if (!r.ok) return setError(r.error);
      setSuggestions(r.suggestions);
      setTasks([]);
      setScripted(r.scripted);
      switchTo("pick");
    });

  const sortWeek = () =>
    startLoading(async () => {
      setError(null);
      const r = await triageWeek(discovery.id, week.split("\n"));
      if (!r.ok) return setError(r.error);
      setTasks(r.tasks);
      setSuggestions(r.suggestions);
      setScripted(r.scripted);
      setPicked(null);
    });

  const deal = () =>
    startSaving(async () => {
      setError(null);
      const r = mode !== "own" && picked !== null ? await chooseChallenge(discovery.id, { kind: "ai", index: picked }) : await chooseChallenge(discovery.id, { kind: "own", ...own });
      if (!r.ok) return setError(r.error);
      onDone();
    });

  const cards = (
    <div className="space-y-3">
      {scripted && <p className="text-sm text-ink-500">These are sample challenges: the free AI allowance for today has been used.</p>}
      <div className="flex flex-wrap justify-center gap-6 py-4 sm:justify-start">
        <AnimatePresence>
          {suggestions.map((c, i) => (
            <motion.div key={c.title} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.12 }}>
              <GameCard title={c.title} story={c.story} cost={c.cost} whoFeelsIt={c.who_feels_it} label={fn} number={i + 1} tilt={(i - 1) * 3} selected={picked === i} onSelect={() => setPicked(i)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <p className="text-sm text-ink-500">Tap a card to choose it.</p>
    </div>
  );

  const tab = (m: Mode, label: string, onClick: () => void) => (
    <button type="button" role="tab" aria-selected={mode === m} onClick={onClick} className={`rounded-lg px-4 py-2 font-semibold ${mode === m ? "bg-white shadow-card" : "text-ink-700"}`}>
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-bold tracking-wide text-green-700 uppercase">Step 2 · The challenge</p>
        <h1 className="font-display text-4xl font-bold">What should {fn} stop doing by hand?</h1>
        <p className="max-w-2xl text-lg text-ink-700">Bring a real problem, start from your week and let the AI spot the best one, or pick from three common in {fn}.</p>
      </div>

      <div className="inline-flex flex-wrap rounded-xl bg-cream-200 p-1" role="tablist" aria-label="Choose how to set the challenge">
        {tab("own", "Write our own", () => switchTo("own"))}
        {tab("week", "Start from our week", () => switchTo("week"))}
        {tab("pick", loading && mode !== "week" ? "Thinking…" : "✨ AI, suggest some", () => (suggestions.length && !tasks.length ? switchTo("pick") : suggest()))}
      </div>

      {mode === "own" && (
        <div className="grid max-w-3xl gap-4 rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-card">
          <Field label="Give it a short title" hint="For example: “Invoices nobody can find”.">
            <TextInput value={own.title} maxLength={80} onChange={(e) => setOwn({ ...own, title: e.target.value })} />
          </Field>
          <Field label="What happens today?" hint="Who does what by hand, and what goes wrong. A few sentences is plenty.">
            <TextArea value={own.story} maxLength={900} rows={4} onChange={(e) => setOwn({ ...own, story: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="What it costs (optional)" hint="Time, money or goodwill.">
              <TextInput value={own.cost} maxLength={300} onChange={(e) => setOwn({ ...own, cost: e.target.value })} />
            </Field>
            <Field label="Who feels it (optional)" hint="The roles affected.">
              <TextInput value={own.who_feels_it} maxLength={200} onChange={(e) => setOwn({ ...own, who_feels_it: e.target.value })} />
            </Field>
          </div>
        </div>
      )}

      {mode === "week" && (
        <div className="space-y-5">
          {!tasks.length ? (
            <div className="grid max-w-3xl gap-3 rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-card">
              <Field label="What do you do every week?" hint="One task per line, 3 to 12 of them. The boring ones matter most.">
                <TextArea
                  value={week}
                  rows={7}
                  maxLength={2000}
                  onChange={(e) => setWeek(e.target.value)}
                  placeholder={"Chasing new starters for their documents\nCopying expense claims into the spreadsheet\nAnswering the same policy questions on Teams\nPreparing the monthly headcount report"}
                />
              </Field>
              <div>
                <Button type="button" onClick={sortWeek} disabled={loading}>
                  {loading ? "Sorting your week…" : "Sort our week →"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                {TASK_COLUMNS.map((col) => (
                  <section key={col.label} className={`space-y-2 rounded-2xl border-2 p-4 ${col.tone}`} aria-label={col.title}>
                    <div>
                      <h2 className="font-display text-lg font-bold">{col.title}</h2>
                      <p className="text-sm text-ink-700">{col.blurb}</p>
                    </div>
                    <ul className="space-y-2">
                      {tasks
                        .filter((t) => t.label === col.label)
                        .map((t) => (
                          <li key={t.task} className="rounded-xl bg-white/80 p-2.5">
                            <p className="font-semibold">{t.task}</p>
                            <p className="text-sm text-ink-500">{t.why}</p>
                          </li>
                        ))}
                      {!tasks.some((t) => t.label === col.label) && <li className="text-sm text-ink-500">None</li>}
                    </ul>
                  </section>
                ))}
              </div>
              <div className="space-y-1">
                <h2 className="font-display text-2xl font-bold">The best ones to automate</h2>
                <p className="text-ink-700">The AI turned your strongest candidates into challenge cards. Pick one to play.</p>
              </div>
              {cards}
              <button type="button" onClick={() => setTasks([])} className="text-sm font-semibold text-green-700 underline-offset-4 hover:underline">
                Change our tasks
              </button>
            </>
          )}
        </div>
      )}

      {mode === "pick" && cards}

      {error && (
        <p className="rounded-xl bg-danger-50 p-3 text-danger-700" role="alert">
          {error}
        </p>
      )}
      {(mode !== "week" || tasks.length > 0) && (
        <Button type="button" onClick={deal} disabled={saving || (mode !== "own" && picked === null)} className="px-7 py-4 text-lg">
          {saving ? "Dealing…" : "Deal the cards →"}
        </Button>
      )}
    </div>
  );
}
