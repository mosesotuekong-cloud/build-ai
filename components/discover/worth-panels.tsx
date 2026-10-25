"use client";

import { useMemo, useState, useTransition } from "react";
import { saveBusiness } from "@/app/discover/actions";
import { Button } from "@/components/ui/button";
import { AI_ACT_CHECKER_URL, AI_ACT_LABELS, type AiActCheck } from "@/lib/discover/ai-act";
import { businessCase, paybackText, type BusinessInputs } from "@/lib/discover/business";
import { money } from "@/lib/discover/regions";
import { gridPosition, VERDICTS, type Verdict, type VerdictInput } from "@/lib/discover/verdict";

const TONE = {
  green: "border-green-600 bg-green-50",
  amber: "border-amber-400 bg-amber-50",
  grey: "border-cream-300 bg-cream-100",
} as const;

// Is it worth it? The verdict, why, and where it sits on value × effort.
export function VerdictPanel({ verdict, reasons, rank }: { verdict: Verdict | null; reasons: string[]; rank: VerdictInput }) {
  const v = verdict ? VERDICTS[verdict] : null;
  const pos = gridPosition(rank);
  return (
    <section aria-labelledby="verdict-h" className="grid items-start gap-4 lg:grid-cols-[1fr_20rem]">
      <div className={`space-y-2 rounded-2xl border-2 p-5 ${v ? TONE[v.tone] : TONE.grey}`}>
        <p className="text-sm font-bold tracking-wide text-ink-500 uppercase">The verdict</p>
        <h2 id="verdict-h" className="font-display text-3xl font-bold">
          {v?.title ?? "Not rated yet"}
        </h2>
        <p className="text-ink-700">{v?.blurb ?? "Answer the Worth it? card to get a verdict."}</p>
        {reasons.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink-700">
            {reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </div>
      <figure className="space-y-1">
        <div
          className="relative aspect-square w-full max-w-80 rounded-2xl border border-cream-300 bg-white"
          role="img"
          aria-label={pos ? `Value ${rank.value} of 5, effort ${rank.effort}` : "Value and effort not rated yet"}
        >
          {/* Quadrants: the common way consultancies plot AI use cases. */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 text-[11px] font-bold tracking-wide text-ink-300 uppercase">
            <span className="flex items-start p-2">Quick wins</span>
            <span className="flex items-start justify-end p-2 text-right">Big bets</span>
            <span className="flex items-end p-2">Fill-ins</span>
            <span className="flex items-end justify-end p-2 text-right">Money pits</span>
          </div>
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-cream-300" />
          <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-cream-300" />
          {pos && (
            <span
              className="absolute h-5 w-5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white bg-green-700 shadow-card"
              style={{ left: `${pos.x * 100}%`, bottom: `${8 + pos.y * 84}%` }}
              aria-hidden
            />
          )}
        </div>
        <figcaption className="flex max-w-80 justify-between text-xs text-ink-500">
          <span>↑ Value</span>
          <span>Effort →</span>
        </figcaption>
      </figure>
    </section>
  );
}

const FIELDS: { key: keyof Omit<BusinessInputs, "source">; label: string; suffix?: string; money?: boolean; percent?: boolean; step?: number }[] = [
  { key: "cases_per_month", label: "Cases a month" },
  { key: "minutes_per_case", label: "Minutes per case today" },
  { key: "automatable_share", label: "Time the automation removes", percent: true },
  { key: "hourly_rate", label: "Cost of an hour (fully loaded)", money: true },
  { key: "build_days", label: "Days to build and test" },
  { key: "build_day_rate", label: "Cost of a build day", money: true },
  { key: "running_cost_per_month", label: "Running cost a month", money: true },
];

// The business case: live as people change the numbers, saved on request.
export function BusinessCasePanel({ id, initial, currency }: { id: string; initial: BusinessInputs; currency: string }) {
  const [inputs, setInputs] = useState<BusinessInputs>(initial);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const result = useMemo(() => businessCase(inputs), [inputs]);
  const likely = result.scenarios.find((s) => s.key === "likely")!;
  const m = (n: number) => money(n, currency);

  const set = (key: keyof BusinessInputs, raw: string, percent?: boolean) => {
    const n = raw === "" ? 0 : Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    setInputs((i) => ({ ...i, [key]: percent ? Math.min(1, n / 100) : n }));
    setDirty(true);
    setMessage(null);
  };

  return (
    <section aria-labelledby="biz-h" className="space-y-4 rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="biz-h" className="font-display text-2xl font-bold">
            The business case
          </h2>
          <p className="text-sm text-ink-500">
            {inputs.source === "ai" ? "Starting values estimated by the AI from your answers." : inputs.source === "edited" ? "Your numbers." : "Starting values from your hours-saved guess. Make it stronger for better ones."} Change any number.
          </p>
        </div>
        <p className="text-right">
          <span className="block text-sm font-semibold text-ink-500">Likely payback</span>
          <span className="font-display text-3xl font-bold">{paybackText(likely.paybackMonths)}</span>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FIELDS.map((f) => (
          <label key={f.key} className="block space-y-1">
            <span className="text-sm font-semibold text-ink-700">{f.label}</span>
            <span className="flex items-center rounded-xl border border-cream-300 bg-white focus-within:border-green-600 focus-within:ring-2 focus-within:ring-green-100">
              {f.money && <span className="pl-3 text-ink-500">{currency}</span>}
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={f.percent ? 100 : undefined}
                step={f.percent ? 5 : "any"}
                value={f.percent ? Math.round(inputs[f.key] * 100) : inputs[f.key]}
                onChange={(e) => set(f.key, e.target.value, f.percent)}
                className="w-full rounded-xl bg-transparent px-3 py-2 tabular-nums outline-none"
              />
              {f.percent && <span className="pr-3 text-ink-500">%</span>}
            </span>
          </label>
        ))}
      </div>

      <p className="text-sm text-ink-700">
        Today this takes about <strong>{Math.round(result.hoursTodayPerMonth)} hours a month</strong>, costing roughly <strong>{m(result.costTodayPerMonth)}</strong>.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead>
            <tr className="text-xs tracking-wide text-ink-500 uppercase">
              <th className="py-2 pr-3 font-semibold" />
              {result.scenarios.map((s) => (
                <th key={s.key} className={`py-2 pr-3 text-right font-semibold ${s.key === "likely" ? "text-ink-900" : ""}`}>
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {[
              ["Hours saved a month", (s: (typeof result.scenarios)[number]) => Math.round(s.hoursSavedPerMonth).toLocaleString("en-GB")],
              ["Saved a month, after running costs", (s: (typeof result.scenarios)[number]) => m(s.netPerMonth)],
              ["Cost to build", (s: (typeof result.scenarios)[number]) => m(s.buildCost)],
              ["First year, net", (s: (typeof result.scenarios)[number]) => m(s.firstYearNet)],
              ["Payback", (s: (typeof result.scenarios)[number]) => paybackText(s.paybackMonths)],
            ].map(([label, cell]) => (
              <tr key={label as string} className="border-t border-cream-200">
                <th scope="row" className="py-2 pr-3 font-semibold">
                  {label as string}
                </th>
                {result.scenarios.map((s) => (
                  <td key={s.key} className={`py-2 pr-3 text-right ${s.key === "likely" ? "font-bold" : "text-ink-700"}`}>
                    {(cell as (x: typeof s) => string)(s)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-500">Cautious assumes 40% less is automated, a 50% build overrun and higher running costs; optimistic the reverse. Never more than 95% is automated: there are always exceptions and checks.</p>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={!dirty || saving}
          onClick={() =>
            start(async () => {
              const r = await saveBusiness(id, inputs);
              if (r.ok) {
                setDirty(false);
                setInputs((i) => ({ ...i, source: "edited" }));
                setMessage("Saved. The PDF uses these numbers.");
              } else setMessage(r.error);
            })
          }
        >
          {saving ? "Saving…" : "Save these numbers"}
        </Button>
        {message && (
          <span className="text-sm text-ink-700" role="status">
            {message}
          </span>
        )}
      </div>
    </section>
  );
}

const AI_ACT_TONE = {
  red: "border-danger-600 bg-danger-50",
  amber: "border-amber-400 bg-amber-50",
  blue: "border-cream-300 bg-white",
  green: "border-cream-300 bg-white",
} as const;

// EU AI Act: a first read, never legal advice.
export function AiActPanel({ check, emphasise }: { check: AiActCheck; emphasise: boolean }) {
  const label = AI_ACT_LABELS[check.category];
  const serious = check.category === "prohibited" || check.category === "high_risk";
  return (
    <section aria-labelledby="aiact-h" className={`space-y-3 rounded-2xl border-2 p-5 ${AI_ACT_TONE[label.tone]}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="aiact-h" className="font-display text-xl font-bold">
          <span className="mr-2" aria-hidden>
            {serious ? "⚠️" : "🇪🇺"}
          </span>
          {label.title}
        </h2>
        <span className="text-xs font-semibold text-ink-500">{check.source === "ai" ? "The AI's assessment" : "First read from your words"} · not legal advice</span>
      </div>
      {check.area && <p className="text-sm font-semibold text-ink-700">{check.area}</p>}
      <p className="text-ink-700">{check.reason}</p>
      {(serious || emphasise) && check.actions.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-ink-700">
          {check.actions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
      <p className="text-sm text-ink-500">
        {emphasise ? "This applies to organisations in the EU." : "This applies if you operate in, or sell into, the EU."}{" "}
        <a href={AI_ACT_CHECKER_URL} target="_blank" rel="noreferrer" className="font-semibold text-green-700 underline">
          Check it with the European Commission&apos;s tool
        </a>
        {check.source === "keywords" ? ". Make it stronger for the AI's fuller assessment." : "."}
      </p>
    </section>
  );
}
