"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { chooseChallenge, suggestChallengesFor } from "@/app/discover/actions";
import { GameCard } from "@/components/game/game-card";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { functionLabel, type Challenge, type Discovery } from "@/lib/discover/model";

// Step two: the challenge. Type your own, or let the AI suggest three for
// the function, then pick one. Either way, the cards are dealt next.
export function ChallengeStep({ discovery, onDone }: { discovery: Discovery; onDone: () => void }) {
  const [mode, setMode] = useState<"pick" | "own">(discovery.suggestions?.length ? "pick" : "own");
  const [suggestions, setSuggestions] = useState<Challenge[]>(discovery.suggestions ?? []);
  const [picked, setPicked] = useState<number | null>(null);
  const [own, setOwn] = useState({ title: "", story: "", cost: "", who_feels_it: "" });
  const [scripted, setScripted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();
  const fn = functionLabel(discovery.function_slug);

  const suggest = () =>
    startLoading(async () => {
      setError(null);
      const r = await suggestChallengesFor(discovery.id);
      if (!r.ok) return setError(r.error);
      setSuggestions(r.suggestions);
      setScripted(r.scripted);
      setMode("pick");
    });

  const deal = () =>
    startSaving(async () => {
      setError(null);
      const r = mode === "pick" && picked !== null ? await chooseChallenge(discovery.id, { kind: "ai", index: picked }) : await chooseChallenge(discovery.id, { kind: "own", ...own });
      if (!r.ok) return setError(r.error);
      onDone();
    });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-bold tracking-wide text-green-700 uppercase">Step 2 · The challenge</p>
        <h1 className="font-display text-4xl font-bold">What should {fn} stop doing by hand?</h1>
        <p className="max-w-2xl text-lg text-ink-700">Bring a real problem from your work, or let the AI suggest three that are common in {fn}.</p>
      </div>

      <div className="inline-flex rounded-xl bg-cream-200 p-1" role="tablist" aria-label="Choose how to set the challenge">
        <button type="button" role="tab" aria-selected={mode === "own"} onClick={() => setMode("own")} className={`rounded-lg px-4 py-2 font-semibold ${mode === "own" ? "bg-white shadow-card" : "text-ink-700"}`}>
          Write our own
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "pick"}
          onClick={() => (suggestions.length ? setMode("pick") : suggest())}
          className={`rounded-lg px-4 py-2 font-semibold ${mode === "pick" ? "bg-white shadow-card" : "text-ink-700"}`}
        >
          {loading ? "Thinking…" : "✨ AI, suggest some"}
        </button>
      </div>

      {mode === "own" ? (
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
      ) : (
        <div className="space-y-3">
          {scripted && <p className="text-sm text-ink-500">These are sample challenges: the free AI allowance for today has been used.</p>}
          <div className="flex flex-wrap justify-center gap-6 py-4 sm:justify-start">
            <AnimatePresence>
              {suggestions.map((c, i) => (
                <motion.div key={c.title} initial={{ y: 60, opacity: 0, rotate: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.12 }}>
                  <GameCard title={c.title} story={c.story} cost={c.cost} whoFeelsIt={c.who_feels_it} label={fn} number={i + 1} tilt={(i - 1) * 3} selected={picked === i} onSelect={() => setPicked(i)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <p className="text-sm text-ink-500">Tap a card to choose it.</p>
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-danger-50 p-3 text-danger-700" role="alert">
          {error}
        </p>
      )}
      <Button type="button" onClick={deal} disabled={saving || (mode === "pick" && picked === null)} className="px-7 py-4 text-lg">
        {saving ? "Dealing…" : "Deal the cards →"}
      </Button>
    </div>
  );
}
