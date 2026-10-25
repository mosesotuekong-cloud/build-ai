import { z } from "zod";

// Worth it?: value, effort, readiness, risk and reversibility, then one
// clear verdict. The same axes the consultancies score on (value,
// feasibility, data readiness, risk), plus reversibility: whether a wrong
// decision can be undone.

export const EFFORT_LEVELS = [
  { value: "low", label: "Small", hint: "A few days with tools we already have." },
  { value: "medium", label: "Medium", hint: "A few weeks, or a new connection to set up." },
  { value: "high", label: "Big", hint: "Months, several systems, or new tools to buy." },
] as const;

export const REVERSIBILITY_LEVELS = [
  { value: "easy", label: "Easy to undo", hint: "A wrong result is spotted and fixed in minutes." },
  { value: "hard", label: "Hard to undo", hint: "Fixable, but it costs time, money or goodwill." },
  { value: "cannot", label: "Can't be undone", hint: "Money sent, a person rejected, a message to a customer." },
] as const;

export const effortSchema = z.enum(["low", "medium", "high"]);
export const reversibilitySchema = z.enum(["easy", "hard", "cannot"]);

export type Verdict = "fund" | "plan" | "fix_data" | "park";
export const VERDICTS: Record<Verdict, { title: string; blurb: string; tone: "green" | "amber" | "grey" }> = {
  fund: { title: "Fund it now", blurb: "Valuable, doable and safe enough. Build a pilot in the next few weeks.", tone: "green" },
  plan: { title: "Plan it", blurb: "Worth doing, but it needs real work or careful controls. Scope it and fund it properly.", tone: "amber" },
  fix_data: { title: "Fix the data first", blurb: "The value is there, the data isn't yet. Sort the data, then build.", tone: "grey" },
  park: { title: "Park it", blurb: "Not worth it right now. Revisit if the volume or pain grows.", tone: "grey" },
};

export type VerdictInput = {
  value: number | null;
  effort: "low" | "medium" | "high" | null;
  readiness: "ready" | "partly" | "not_yet" | null;
  risk: "low" | "medium" | "high" | null;
  reversibility: "easy" | "hard" | "cannot" | null;
  // Control: "in" means a person approves every case.
  oversight?: "in" | "on" | "out" | null;
};

// The one rule behind the verdict. Low value is parked; data that isn't
// ready comes first; big effort, high risk, partial readiness, or decisions
// that can't be undone without a person approving each one need planning;
// the rest are funded now.
export function verdictFrom(r: VerdictInput): Verdict | null {
  if (r.value === null || r.readiness === null) return null;
  if (r.value <= 2) return "park";
  if (r.readiness === "not_yet") return "fix_data";
  const irreversible = r.reversibility === "cannot" && r.oversight !== "in";
  if (r.effort === "high" || r.risk === "high" || r.readiness === "partly" || irreversible) return "plan";
  return "fund";
}

// Why the verdict came out as it did, in plain words.
export function verdictReasons(r: VerdictInput): string[] {
  const out: string[] = [];
  if (r.value !== null && r.value <= 2) out.push("The value is low for now.");
  if (r.readiness === "not_yet") out.push("The data isn't ready yet.");
  if (r.readiness === "partly") out.push("Some data or access is still missing.");
  if (r.effort === "high") out.push("It's a big build.");
  if (r.risk === "high") out.push("Mistakes would be costly or sensitive.");
  if (r.reversibility === "cannot" && r.oversight !== "in") out.push("Some actions can't be undone, and a person doesn't approve every case.");
  if (!out.length && r.value !== null) out.push("Good value, ready data and manageable risk.");
  return out;
}

// Where it sits on the value × effort grid, as fractions from 0 to 1 (x is
// effort, y is value). Null if either is missing.
export function gridPosition(r: Pick<VerdictInput, "value" | "effort">): { x: number; y: number } | null {
  if (r.value === null || r.effort === null) return null;
  const x = { low: 0.18, medium: 0.5, high: 0.82 }[r.effort];
  return { x, y: (r.value - 1) / 4 };
}
