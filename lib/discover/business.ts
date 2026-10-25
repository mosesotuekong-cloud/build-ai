import { z } from "zod";
import type { Region } from "./regions";

// The business case: what the work costs today, what the automation saves,
// what it costs to build and run, and when it pays back. Worked out in code
// from a handful of inputs people can see and change; the AI only suggests
// starting values. Three scenarios, because real processes always have
// exceptions and human review, so they are rarely fully automatable.

export const businessInputsSchema = z.object({
  cases_per_month: z.number().min(0).max(1_000_000),
  minutes_per_case: z.number().min(0).max(10_000),
  // Share of today's handling time the automation takes away, 0–1.
  automatable_share: z.number().min(0).max(1),
  hourly_rate: z.number().min(0).max(1_000_000),
  build_days: z.number().min(0).max(1000),
  build_day_rate: z.number().min(0).max(10_000_000),
  // Licences, AI usage and support, a month.
  running_cost_per_month: z.number().min(0).max(10_000_000),
  // Who set them: the team's own guess, the AI's estimate, or edited by hand.
  source: z.enum(["guess", "ai", "edited"]).default("guess"),
});
export type BusinessInputs = z.infer<typeof businessInputsSchema>;

export type Scenario = {
  key: "low" | "likely" | "high";
  label: string;
  hoursSavedPerMonth: number;
  savingPerMonth: number;
  netPerMonth: number;
  buildCost: number;
  firstYearNet: number;
  // Months until the build cost is paid back; null if it never pays back.
  paybackMonths: number | null;
};

export type BusinessCase = {
  hoursTodayPerMonth: number;
  costTodayPerMonth: number;
  scenarios: Scenario[];
};

const SCENARIOS = [
  // Less is automated than hoped and the build overruns.
  { key: "low", label: "Cautious", share: 0.6, build: 1.5, running: 1.3 },
  { key: "likely", label: "Likely", share: 1, build: 1, running: 1 },
  // More is automated and the build goes smoothly.
  { key: "high", label: "Optimistic", share: 1.15, build: 0.8, running: 0.9 },
] as const;

export function businessCase(i: BusinessInputs): BusinessCase {
  const hoursToday = (i.cases_per_month * i.minutes_per_case) / 60;
  return {
    hoursTodayPerMonth: hoursToday,
    costTodayPerMonth: hoursToday * i.hourly_rate,
    scenarios: SCENARIOS.map((s) => {
      const share = Math.min(0.95, i.automatable_share * s.share);
      const hoursSaved = hoursToday * share;
      const saving = hoursSaved * i.hourly_rate;
      const running = i.running_cost_per_month * s.running;
      const net = saving - running;
      const build = i.build_days * i.build_day_rate * s.build;
      return {
        key: s.key,
        label: s.label,
        hoursSavedPerMonth: hoursSaved,
        savingPerMonth: saving,
        netPerMonth: net,
        buildCost: build,
        firstYearNet: net * 12 - build,
        paybackMonths: net > 0 ? build / net : null,
      };
    }),
  };
}

export const paybackText = (months: number | null) =>
  months === null ? "Doesn't pay back" : months < 1 ? "Under a month" : months > 60 ? "Over 5 years" : `${Math.ceil(months)} month${Math.ceil(months) === 1 ? "" : "s"}`;

// Starting values before the AI has estimated anything: built from the
// team's own "hours saved a month" guess and the size of the workflow.
export function defaultInputs(input: { hoursSavedGuess: number | null; blocks: number; region: Region }): BusinessInputs {
  const share = 0.6;
  const hoursToday = input.hoursSavedGuess ? input.hoursSavedGuess / share : 20;
  const minutes = 15;
  return {
    cases_per_month: Math.max(1, Math.round((hoursToday * 60) / minutes)),
    minutes_per_case: minutes,
    automatable_share: share,
    hourly_rate: input.region.hourlyRate,
    build_days: Math.max(2, Math.min(30, Math.round(input.blocks * 0.75))),
    build_day_rate: input.region.buildDayRate,
    running_cost_per_month: Math.round(input.region.hourlyRate * 2),
    source: "guess",
  };
}
