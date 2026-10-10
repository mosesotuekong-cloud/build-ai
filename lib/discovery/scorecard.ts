import { z } from "zod";

// The discovery scorecard each team fills in for its own use case during the
// prioritise phase. The same fields are assessed by the AI at judging.

export const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "rarely", label: "Rarely" },
] as const;

export const DATA_QUESTIONS = [
  { key: "data_location", question: "Do we know where the data lives?", options: [{ value: "known", label: "Yes" }, { value: "unsure", label: "Not sure" }] },
  {
    key: "data_access",
    question: "Can we get access to it?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "partly", label: "Partly" },
      { value: "no", label: "No" },
      { value: "unsure", label: "Not sure" },
    ],
  },
  {
    key: "data_quality",
    question: "Is it clean enough to use?",
    options: [
      { value: "good", label: "Yes" },
      { value: "messy", label: "It's messy" },
      { value: "unsure", label: "Not sure" },
    ],
  },
  {
    key: "personal_data",
    question: "Does it contain personal data?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "unsure", label: "Not sure" },
    ],
  },
] as const;

export const RISKS = [
  { value: "money", label: "Moves money" },
  { value: "pay", label: "Affects pay" },
  { value: "people_decisions", label: "Decides about people" },
  { value: "customer_facing", label: "Talks to customers" },
  { value: "health_safety", label: "Health and safety" },
  { value: "legal", label: "Legal or compliance" },
] as const;

// Rank: three taps. Value (1–5, stored as impact), readiness and risk.
export const VALUE_LABELS = ["A little", "Some", "Useful", "A lot", "A big deal"] as const;
export const READINESS = [
  { value: "ready", label: "Ready", hint: "We know where the data is and can get to it." },
  { value: "partly", label: "Partly", hint: "Some gaps in data, access or the process." },
  { value: "not_yet", label: "Not yet", hint: "The data is messy, missing or locked away." },
] as const;
export const RISK_LEVELS = [
  { value: "low", label: "Low", hint: "Easy to spot and undo if it goes wrong." },
  { value: "medium", label: "Medium", hint: "Annoying or costly, but fixable." },
  { value: "high", label: "High", hint: "Money, pay, people decisions, customers, safety or the law." },
] as const;

// Kinds of AI a use case can need. Agreed 2026-10-09.
export const AI_KINDS = [
  { value: "rule", label: "Simple rule", hint: "No AI needed" },
  { value: "classify", label: "Classify or route", hint: "Sort things into groups" },
  { value: "extract", label: "Extract from documents", hint: "Read forms, invoices, CVs" },
  { value: "summarise", label: "Summarise", hint: "Turn a lot into a little" },
  { value: "draft", label: "Draft or generate", hint: "Write replies, reports" },
  { value: "answer_data", label: "Answer questions over data", hint: "Ask the numbers in plain words" },
  { value: "forecast", label: "Forecast", hint: "Predict what's coming" },
  { value: "assistant", label: "Chat or voice assistant", hint: "A WhatsApp or phone bot" },
  { value: "agent", label: "Agent that takes actions", hint: "Does steps across systems" },
] as const;

const values = <T extends readonly { value: string }[]>(list: T) => list.map((o) => o.value) as [T[number]["value"], ...T[number]["value"][]];

export const scorecardPatchSchema = z
  .object({
    impact: z.number().int().min(1).max(5).nullable(),
    effort: z.number().int().min(1).max(5).nullable(),
    frequency: z.enum(values(FREQUENCIES)).nullable(),
    volume_per_month: z.number().int().min(0).max(1_000_000).nullable(),
    data_location: z.enum(["known", "unsure"]).nullable(),
    data_access: z.enum(["yes", "partly", "no", "unsure"]).nullable(),
    data_quality: z.enum(["good", "messy", "unsure"]).nullable(),
    personal_data: z.enum(["yes", "no", "unsure"]).nullable(),
    risks: z.array(z.enum(values(RISKS))).max(RISKS.length),
    ai_kind: z.enum(values(AI_KINDS)).nullable(),
    platform_fit: z.string().max(60).nullable(),
    readiness: z.enum(values(READINESS)).nullable(),
    risk_level: z.enum(values(RISK_LEVELS)).nullable(),
  })
  .partial();
export type ScorecardPatch = z.infer<typeof scorecardPatchSchema>;

export type Scorecard = {
  impact: number | null;
  effort: number | null;
  frequency: string | null;
  volume_per_month: number | null;
  data_location: string | null;
  data_access: string | null;
  data_quality: string | null;
  personal_data: string | null;
  risks: string[];
  ai_kind: string | null;
  platform_fit: string | null;
  // Rank (three taps): value is stored as impact.
  readiness: string | null;
  risk_level: string | null;
};

export const EMPTY_SCORECARD: Scorecard = {
  impact: null,
  effort: null,
  frequency: null,
  volume_per_month: null,
  data_location: null,
  data_access: null,
  data_quality: null,
  personal_data: null,
  risks: [],
  ai_kind: null,
  platform_fit: null,
  readiness: null,
  risk_level: null,
};

// How much of the Rank round is answered: value, readiness and risk.
export function scorecardProgress(s: Pick<Scorecard, "impact" | "readiness" | "risk_level">): { done: number; total: number } {
  const parts = [s.impact !== null, s.readiness, s.risk_level];
  return { done: parts.filter(Boolean).length, total: parts.length };
}

// A starting suggestion for the kind of AI, from the words in the team's
// Decision slot. Teams can always change it.
export function suggestAiKind(decision: string): Scorecard["ai_kind"] {
  const text = decision.toLowerCase();
  if (!text.trim()) return null;
  // Whole words only, so "invoice" never counts as "voice".
  const words = ` ${text.replace(/[^a-z0-9₦]+/g, " ")} `;
  const has = (...phrases: string[]) => phrases.some((p) => words.includes(` ${p}`));
  if (has("forecast", "predict", "estimate demand")) return "forecast";
  if (has("chatbot", "chat bot", "whatsapp bot", "voice", "answers staff", "answers customers")) return "assistant";
  if (has("extract", "read the form", "read the invoice", "read the document", "ocr", "scan")) return "extract";
  if (has("summar")) return "summarise";
  if (has("draft", "write a reply", "generate")) return "draft";
  if (has("ask the data", "question about the data", "query", "dashboard question")) return "answer_data";
  if (has("classif", "categor", "route", "sort", "score", "triage", "prioriti")) return "classify";
  if (has("agent")) return "agent";
  if (/\bif\b|\brule\b|over ₦|under ₦|more than|less than|greater than|threshold|>|</.test(text)) return "rule";
  if (has("ai ")) return "classify";
  return null;
}

// Portfolio bucket used by the opportunity map.
export type Bucket = "quick_win" | "strategic_bet" | "fix_data" | "park";
export function portfolioBucket(
  s: Pick<Scorecard, "impact" | "readiness" | "risk_level"> & Partial<Pick<Scorecard, "effort" | "data_access" | "data_quality" | "data_location">>,
): Bucket | null {
  if (s.impact === null) return null;
  // Rank (value × readiness × risk).
  if (s.readiness) return bucketFrom(s.impact, s.readiness as Readiness, (s.risk_level ?? "medium") as RiskLevel);
  // Older sessions used the long scorecard (impact, effort, data questions).
  if (s.effort === null || s.effort === undefined) return null;
  const dataNotReady = s.data_access === "no" || s.data_quality === "messy" || s.data_location === "unsure" || s.data_access === "unsure";
  if (s.impact <= 2) return "park";
  if (dataNotReady) return "fix_data";
  return s.effort <= 3 ? "quick_win" : "strategic_bet";
}

export type Readiness = (typeof READINESS)[number]["value"];
export type RiskLevel = (typeof RISK_LEVELS)[number]["value"];

// The one rule behind the portfolio: low value is parked; data that isn't
// ready comes first; high risk or partial readiness needs real work; the
// rest are quick wins. The same rule runs on the AI's assessment.
export function bucketFrom(value: number, readiness: Readiness, risk: RiskLevel): Bucket {
  if (value <= 2) return "park";
  if (readiness === "not_yet") return "fix_data";
  if (risk === "high" || readiness === "partly") return "strategic_bet";
  return "quick_win";
}
