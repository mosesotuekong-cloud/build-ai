"use client";

import { useState, useTransition } from "react";
import { startDiscovery } from "@/app/discover/actions";
import { PlatformPicker } from "@/components/decks/platform-picker";
import { Button } from "@/components/ui/button";
import { FUNCTIONS } from "@/lib/config/app";
import { MAX_PLAYERS } from "@/lib/discover/model";
import { REGIONS, type RegionSlug } from "@/lib/discover/regions";

const pill = (on: boolean) =>
  `cursor-pointer rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors select-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-green-600 ${
    on ? "border-green-600 bg-green-600 text-cream-50" : "border-cream-300 bg-cream-50 text-ink-700 hover:border-green-400"
  }`;

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-card sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 font-display font-bold text-cream-50">{n}</span>
        <div>
          <h2 className="font-display text-xl font-bold">{title}</h2>
          {hint && <p className="text-sm text-ink-500">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

// Step one of a discovery: function, team size, tech stack and region.
export function SetupForm() {
  const [fn, setFn] = useState<string>("");
  const [players, setPlayers] = useState(1);
  const [names, setNames] = useState<string[]>(Array(MAX_PLAYERS).fill(""));
  const [stack, setStack] = useState<string[]>([]);
  const [region, setRegion] = useState<RegionSlug>("uk");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const ready = fn && stack.length > 0;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return setError(!fn ? "Pick a function first." : "Pick at least one tool in your stack.");
        setError(null);
        start(async () => {
          const result = await startDiscovery({ function_slug: fn, players, player_names: names.slice(0, players), stack, region });
          if (result && !result.ok) setError(result.error);
        });
      }}
    >
      <Step n={1} title="Which part of the business?" hint="Pick the function or business unit you want to explore.">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Business function">
          {FUNCTIONS.map((f) => (
            <label key={f.slug} className={pill(fn === f.slug)}>
              <input type="radio" name="function" value={f.slug} checked={fn === f.slug} onChange={() => setFn(f.slug)} className="sr-only" />
              {f.name}
            </label>
          ))}
        </div>
      </Step>

      <Step n={2} title="How many of you are playing?" hint="Play alone, or as a team around one screen. Cards take turns round the table.">
        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" className="h-11 w-11 p-0 text-xl" onClick={() => setPlayers((p) => Math.max(1, p - 1))} aria-label="One fewer player">
            −
          </Button>
          <output className="w-10 text-center font-display text-3xl font-bold" aria-live="polite">
            {players}
          </output>
          <Button type="button" variant="secondary" className="h-11 w-11 p-0 text-xl" onClick={() => setPlayers((p) => Math.min(MAX_PLAYERS, p + 1))} aria-label="One more player">
            +
          </Button>
          <span className="text-ink-700">{players === 1 ? "Just me" : "players"}</span>
        </div>
        {players > 1 && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: players }, (_, i) => (
              <input
                key={i}
                value={names[i]}
                maxLength={30}
                onChange={(e) => setNames((all) => all.map((n, j) => (j === i ? e.target.value : n)))}
                placeholder={`Player ${i + 1} (optional)`}
                aria-label={`Player ${i + 1} name`}
                className="rounded-xl border border-cream-300 bg-white px-3 py-2 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              />
            ))}
            <p className="text-sm text-ink-500 sm:col-span-2 lg:col-span-4">Names stay on this screen. They are never sent to the AI.</p>
          </div>
        )}
      </Step>

      <Step n={3} title="What's in your tech stack?" hint="The tools you could build with. The AI designs for these, and your downloads match them.">
        <PlatformPicker selected={stack} onChange={setStack} />
      </Step>

      <Step n={4} title="Where is the business?" hint="So examples, tools and money look like your world.">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Region">
          {REGIONS.map((r) => (
            <label key={r.slug} className={pill(region === r.slug)}>
              <input type="radio" name="region" value={r.slug} checked={region === r.slug} onChange={() => setRegion(r.slug)} className="sr-only" />
              {r.name}
            </label>
          ))}
        </div>
      </Step>

      {error && (
        <p className="rounded-xl bg-danger-50 p-3 text-danger-700" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="px-7 py-4 text-lg">
        {pending ? "Setting up…" : "Next: choose the challenge →"}
      </Button>
    </form>
  );
}
