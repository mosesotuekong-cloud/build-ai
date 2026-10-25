"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState, useTransition } from "react";
import { buildWorkflow, nudge, saveCards } from "@/app/discover/actions";
import { Button } from "@/components/ui/button";
import { ChipSelect } from "@/components/ui/chip-select";
import { TextArea, TextInput } from "@/components/ui/field";
import { FIX_PROMPTS, OVERSIGHT_LEVELS, type Oversight } from "@/lib/ai/schemas/canvas";
import { COMMON_SYSTEMS } from "@/lib/config/systems";
import { READINESS, RISK_LEVELS, VALUE_LABELS } from "@/lib/discovery/scorecard";
import { EFFORT_LEVELS, REVERSIBILITY_LEVELS } from "@/lib/discover/verdict";
import { CARD_EXAMPLES, CARDS, playerFor, type CardKey, type Discovery, type DiscoveryDesign, type Rank } from "@/lib/discover/model";

const tile = (on: boolean, amber = false) =>
  `rounded-xl border-2 p-3 text-left transition-colors ${
    on ? (amber ? "border-amber-400 bg-amber-50" : "border-green-600 bg-green-50") : "border-cream-300 bg-white hover:border-green-400"
  }`;

// Step three: the cards. One at a time, taking turns round the table:
// Fix it first → Trigger → Steps → Decision → Action → Control → Worth it?
export function CardsStep({ discovery, onBuilt }: { discovery: Discovery; onBuilt: () => void }) {
  const [card, setCard] = useState(Math.min(discovery.card, CARDS.length - 1));
  const [design, setDesign] = useState<DiscoveryDesign>(discovery.design);
  const [rank, setRank] = useState<Rank>(discovery.rank);
  const [nudges, setNudges] = useState<Partial<Record<CardKey, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [nudging, startNudging] = useTransition();
  const [building, startBuilding] = useTransition();
  const reduce = useReducedMotion();

  const current = CARDS[card];
  const turn = playerFor(discovery, card);
  const progress = (c = card) => ({ design, rank, card: c });
  const set = (patch: Partial<DiscoveryDesign>) => setDesign((d) => ({ ...d, ...patch }));
  const last = card === CARDS.length - 1;

  const go = (next: number) =>
    startSaving(async () => {
      setError(null);
      const r = await saveCards(discovery.id, progress(next));
      if (!r.ok) return setError(r.error);
      setCard(next);
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });

  const askNudge = () =>
    startNudging(async () => {
      setError(null);
      const r = await nudge(discovery.id, current.key, progress());
      if (!r.ok) return setError(r.error);
      setNudges((n) => ({ ...n, [current.key]: r.question }));
    });

  const build = () =>
    startBuilding(async () => {
      setError(null);
      if (rank.value === null || rank.readiness === null) {
        return setError(`Before building, pick ${[rank.value === null && "how much it's worth", rank.readiness === null && "how ready the data and systems are"].filter(Boolean).join(" and ")}.`);
      }
      const r = await buildWorkflow(discovery.id, progress());
      if (!r.ok) return setError(r.error);
      onBuilt();
    });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-bold tracking-wide text-green-700 uppercase">Step 3 · Draw the cards</p>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{discovery.challenge?.title}</h1>
        <details className="max-w-3xl text-ink-700">
          <summary className="cursor-pointer text-sm font-semibold text-ink-500">Read the challenge again</summary>
          <p className="mt-2">{discovery.challenge?.story}</p>
        </details>
      </div>

      {/* The deck: which cards are done */}
      <ol className="flex flex-wrap gap-2" aria-label="Cards">
        {CARDS.map((c, i) => (
          <li key={c.key}>
            <button
              type="button"
              onClick={() => i !== card && go(i)}
              aria-current={i === card ? "step" : undefined}
              className={`rounded-lg border-2 px-3 py-1.5 text-sm font-bold transition-colors ${
                i === card ? "border-green-600 bg-green-600 text-cream-50" : i < card ? "border-green-200 bg-green-50 text-green-700" : "border-cream-300 bg-cream-50 text-ink-500"
              }`}
            >
              {i < card ? "✓ " : ""}
              {c.title}
            </button>
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        <motion.section
          key={current.key}
          initial={reduce ? { opacity: 0 } : { rotateY: -80, opacity: 0, y: 20 }}
          animate={reduce ? { opacity: 1 } : { rotateY: 0, opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { rotateY: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className={`max-w-3xl overflow-hidden rounded-3xl border-2 bg-cream-50 shadow-lift [transform-style:preserve-3d] ${current.key === "human" ? "border-amber-400" : "border-cream-300"}`}
          aria-labelledby="card-title"
        >
          <div className={`flex items-center justify-between px-6 py-3 text-sm font-bold ${current.key === "human" ? "bg-amber-400 text-ink-900" : "bg-green-600 text-cream-50"}`}>
            <span>
              Card {card + 1} of {CARDS.length} · {current.step}
            </span>
            {turn && <span aria-live="polite">{turn}&apos;s card</span>}
          </div>

          <div className="space-y-5 p-6">
            <div>
              <h2 id="card-title" className="font-display text-3xl font-bold">
                {current.title}
              </h2>
              <p className="text-lg text-ink-700">{current.prompt}</p>
            </div>

            {current.key === "fix" && (
              <div className="space-y-3">
                {FIX_PROMPTS.map((f) => (
                  <label key={f.key} className="block space-y-1">
                    <span className="text-sm font-semibold text-ink-700">
                      {f.label}: <span className="font-normal">{f.question}</span>
                    </span>
                    <TextInput value={design.fix[f.key]} maxLength={300} onChange={(e) => set({ fix: { ...design.fix, [f.key]: e.target.value } })} />
                  </label>
                ))}
                <p className="text-sm text-ink-500">Optional, but the best automations start by removing work, not speeding it up.</p>
              </div>
            )}

            {(current.key === "trigger" || current.key === "steps" || current.key === "decision" || current.key === "action") && (
              <div className="space-y-3">
                <TextArea value={design[current.key]} maxLength={800} rows={4} aria-label={current.title} onChange={(e) => set({ [current.key]: e.target.value })} />
                {CARD_EXAMPLES[current.key] && <p className="text-sm text-ink-500">For example: {CARD_EXAMPLES[current.key]}</p>}
                {current.key === "steps" && (
                  <ChipSelect label="Systems involved" hint="Where the data lives today. Pick or type your own." value={design.systems} onChange={(systems) => set({ systems })} suggestions={COMMON_SYSTEMS} max={15} />
                )}
              </div>
            )}

            {current.key === "human" && (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="How much a person stays involved">
                  {OVERSIGHT_LEVELS.map((o) => (
                    <button key={o.value} type="button" role="radio" aria-checked={design.oversight === o.value} onClick={() => set({ oversight: o.value as Oversight })} className={tile(design.oversight === o.value, true)}>
                      <span className="block font-bold">{o.label}</span>
                      <span className="block text-sm text-ink-700">{o.hint}</span>
                    </button>
                  ))}
                </div>
                <TextArea value={design.human} maxLength={600} rows={3} placeholder="Who checks what, and what do they see when they decide?" aria-label="Who checks what" onChange={(e) => set({ human: e.target.value })} />
                <p className="text-sm text-ink-500">For example: {CARD_EXAMPLES.human}</p>
              </div>
            )}

            {current.key === "rank" && (
              <div className="space-y-4">
                <fieldset className="space-y-2">
                  <legend className="font-semibold">How much is it worth?</legend>
                  <div className="flex flex-wrap gap-2">
                    {VALUE_LABELS.map((label, i) => (
                      <button key={label} type="button" aria-pressed={rank.value === i + 1} onClick={() => setRank({ ...rank, value: i + 1 })} className={tile(rank.value === i + 1)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="space-y-2">
                  <legend className="font-semibold">How much work to build?</legend>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {EFFORT_LEVELS.map((o) => (
                      <button key={o.value} type="button" aria-pressed={rank.effort === o.value} onClick={() => setRank({ ...rank, effort: o.value })} className={tile(rank.effort === o.value)}>
                        <span className="block font-bold">{o.label}</span>
                        <span className="block text-sm text-ink-700">{o.hint}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="space-y-2">
                  <legend className="font-semibold">How ready are the data and systems?</legend>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {READINESS.map((o) => (
                      <button key={o.value} type="button" aria-pressed={rank.readiness === o.value} onClick={() => setRank({ ...rank, readiness: o.value })} className={tile(rank.readiness === o.value)}>
                        <span className="block font-bold">{o.label}</span>
                        <span className="block text-sm text-ink-700">{o.hint}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="space-y-2">
                  <legend className="font-semibold">How risky if it goes wrong?</legend>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {RISK_LEVELS.map((o) => (
                      <button key={o.value} type="button" aria-pressed={rank.risk === o.value} onClick={() => setRank({ ...rank, risk: o.value })} className={tile(rank.risk === o.value)}>
                        <span className="block font-bold">{o.label}</span>
                        <span className="block text-sm text-ink-700">{o.hint}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="space-y-2">
                  <legend className="font-semibold">If it gets one wrong, can you undo it?</legend>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {REVERSIBILITY_LEVELS.map((o) => (
                      <button key={o.value} type="button" aria-pressed={rank.reversibility === o.value} onClick={() => setRank({ ...rank, reversibility: o.value })} className={tile(rank.reversibility === o.value)}>
                        <span className="block font-bold">{o.label}</span>
                        <span className="block text-sm text-ink-700">{o.hint}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-sm font-semibold text-ink-700">Name your automation</span>
                    <TextInput value={design.name} maxLength={80} placeholder={discovery.challenge?.title} onChange={(e) => set({ name: e.target.value })} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-semibold text-ink-700">Hours saved a month (a rough guess)</span>
                    <TextInput type="number" min={0} max={5000} inputMode="numeric" value={design.hours_saved_per_month ?? ""} onChange={(e) => set({ hours_saved_per_month: e.target.value === "" ? null : Math.max(0, Math.min(5000, Number(e.target.value))) })} />
                  </label>
                </div>
              </div>
            )}

            {/* The coach: one question, never the answer */}
            <div className="space-y-2">
              {nudges[current.key] ? (
                <p className="rounded-2xl rounded-tl-sm bg-amber-50 p-4 text-ink-900" aria-live="polite">
                  <span className="mr-1">💬</span>
                  {nudges[current.key]}
                </p>
              ) : null}
              <button type="button" onClick={askNudge} disabled={nudging} className="text-sm font-semibold text-green-700 underline-offset-4 hover:underline disabled:opacity-60">
                {nudging ? "Thinking…" : nudges[current.key] ? "Ask another question" : "Stuck? Ask the AI coach a question"}
              </button>
            </div>
          </div>
        </motion.section>
      </AnimatePresence>

      {error && (
        <p className="max-w-3xl rounded-xl bg-danger-50 p-3 text-danger-700" role="alert">
          {error}
        </p>
      )}

      <div className="flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={() => go(card - 1)} disabled={card === 0 || saving}>
          ← Back
        </Button>
        {last ? (
          <Button type="button" onClick={build} disabled={building} className="px-7 py-4 text-lg">
            {building ? "Building your workflow…" : "Build my workflow →"}
          </Button>
        ) : (
          <Button type="button" onClick={() => go(card + 1)} disabled={saving}>
            {saving ? "Saving…" : turn && discovery.players > 1 ? `Pass to ${playerFor(discovery, card + 1)} →` : "Next card →"}
          </Button>
        )}
      </div>
      {building && <p className="text-sm text-ink-500">The AI is turning your cards into a real workflow. This takes up to a minute.</p>}
    </div>
  );
}
