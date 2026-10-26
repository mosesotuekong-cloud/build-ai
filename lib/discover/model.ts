import { z } from "zod";
import { EMPTY_FIX, fixSchema, oversightSchema, type FixNotes, type Oversight } from "@/lib/ai/schemas/canvas";
import { followUpAnswersSchema, followUpSchema, storedStrengthenSchema, triagedTaskSchema, type FollowUp, type FollowUpAnswers, type StoredStrengthened, type TriagedTask } from "@/lib/ai/schemas/discovery";
import { businessInputsSchema, type BusinessInputs } from "./business";
import { effortSchema, reversibilitySchema } from "./verdict";
import type { CoachCase, CoachDesign } from "@/lib/coach/context";
import { FUNCTIONS } from "@/lib/config/app";
import { planSchema, type Plan } from "@/lib/export/plan";
import { getPlatform, PLATFORMS } from "@/lib/config/platforms";
import { getRegion, REGION_SLUGS } from "./regions";

// Quick discovery: pick a function, team size and stack; write or pick a
// challenge; draw the cards; get the outputs; strengthen it with the AI.

export const MAX_PLAYERS = 8;

// The cards, in the order they are drawn. Fix → Design (five slots) →
// Control → Worth it? (Rank), the same method as the workshop.
export const CARDS = [
  { key: "fix", step: "Fix", title: "Fix it first", prompt: "Before automating anything: what would you stop, merge or simplify?" },
  { key: "trigger", step: "Design", title: "Trigger", prompt: "What starts it?" },
  { key: "steps", step: "Design", title: "Steps", prompt: "What information is gathered or prepared, and from which systems?" },
  { key: "decision", step: "Design", title: "Decision", prompt: "What gets decided, and by a simple rule or by AI judgement?" },
  { key: "action", step: "Design", title: "Action", prompt: "What gets done automatically?" },
  { key: "human", step: "Control", title: "Control", prompt: "How much does a person stay involved, and where?" },
  { key: "rank", step: "Rank", title: "Worth it?", prompt: "How much value, how ready, how risky?" },
] as const;
export type CardKey = (typeof CARDS)[number]["key"];

export const CARD_EXAMPLES: Partial<Record<CardKey, string>> = {
  trigger: "A supplier emails an invoice to accounts@ · A new hire is added in the HR system · Every Monday at 9am",
  steps: "Read the invoice PDF, look up the purchase order in the ERP, check the supplier is approved",
  decision: "Rule: if the amounts match within 2%, approve · AI: read the complaint and classify it as billing, delivery or quality",
  action: "Book the invoice for payment, update the tracker and email the supplier a confirmation",
  human: "Finance manager approves anything over £5,000 or where the AI isn't sure, and sees the invoice beside the PO",
};

// The design as the cards fill it in.
export const discoveryDesignSchema = z.object({
  fix: fixSchema.default(EMPTY_FIX),
  trigger: z.string().trim().max(600).default(""),
  steps: z.string().trim().max(800).default(""),
  decision: z.string().trim().max(800).default(""),
  action: z.string().trim().max(800).default(""),
  human: z.string().trim().max(600).default(""),
  oversight: oversightSchema.nullable().default(null),
  name: z.string().trim().max(80).default(""),
  hours_saved_per_month: z.number().min(0).max(5000).nullable().default(null),
  systems: z.array(z.string().trim().min(1).max(60)).max(15).default([]),
});
export type DiscoveryDesign = z.infer<typeof discoveryDesignSchema>;

export const rankSchema = z.object({
  value: z.number().int().min(1).max(5).nullable().default(null),
  effort: effortSchema.nullable().default(null),
  readiness: z.enum(["ready", "partly", "not_yet"]).nullable().default(null),
  risk: z.enum(["low", "medium", "high"]).nullable().default(null),
  reversibility: reversibilitySchema.nullable().default(null),
});
export type Rank = z.infer<typeof rankSchema>;

// A challenge: one of the AI's cards, or one people wrote themselves (which
// can be shorter than the AI's).
export const challengeSchema = z.object({
  title: z.string().trim().min(3).max(80),
  story: z.string().trim().min(20).max(900),
  cost: z.string().trim().max(300),
  who_feels_it: z.string().trim().max(200),
  source: z.enum(["own", "ai"]),
});
export type Challenge = z.infer<typeof challengeSchema>;

// What someone types for their own challenge: looser than the AI's cards.
export const ownChallengeSchema = z.object({
  title: z.string().trim().min(3, "Give it a short title.").max(80),
  story: z.string().trim().min(20, "Say a little more about what happens today.").max(900),
  cost: z.string().trim().max(300).default(""),
  who_feels_it: z.string().trim().max(200).default(""),
});

export const setupSchema = z.object({
  function_slug: z.enum(FUNCTIONS.map((f) => f.slug) as [string, ...string[]]),
  players: z.number().int().min(1).max(MAX_PLAYERS),
  player_names: z.array(z.string().trim().max(30)).max(MAX_PLAYERS),
  stack: z.array(z.enum(PLATFORMS.map((p) => p.slug) as [string, ...string[]])).min(1, "Pick at least one tool.").max(10),
  region: z.enum(REGION_SLUGS),
});
export type Setup = z.infer<typeof setupSchema>;

// A discovery as the screens see it.
export type Discovery = {
  id: string;
  function_slug: string;
  players: number;
  player_names: string[];
  stack: string[];
  region: string;
  stage: "challenge" | "cards" | "results";
  challenge: Challenge | null;
  suggestions: Challenge[] | null;
  design: DiscoveryDesign;
  rank: Rank;
  card: number;
  plan: Plan | null;
  questions: FollowUp["questions"] | null;
  answers: FollowUpAnswers | null;
  strengthened: StoredStrengthened | null;
  // "Start from our week": the tasks the team listed, sorted by the AI.
  tasks: TriagedTask[] | null;
  // The business case inputs, once someone has seen or changed them.
  business: BusinessInputs | null;
  // "Was this useful?", 1–5, with an optional comment.
  feedback: { useful: number; comment: string } | null;
  // Facts the discovery score needs: coach questions asked, files taken,
  // and the twist drawn on the results screen with the team's answer.
  game: Game;
  // Ask Builda, the chat. No player names.
  chat: ChatTurn[];
  created_at: string;
};

// Reads a database row safely: anything malformed falls back to empty.
export function toDiscovery(row: Record<string, unknown>): Discovery {
  const challenge = challengeSchema.safeParse(row.challenge);
  const suggestions = z.array(challengeSchema).safeParse(row.suggestions);
  const plan = planSchema.safeParse(row.plan);
  const questions = followUpSchema.shape.questions.safeParse(row.questions);
  const answers = followUpAnswersSchema.safeParse(row.answers);
  const strengthened = storedStrengthenSchema.safeParse(row.strengthened);
  const tasks = z.array(triagedTaskSchema).safeParse(row.tasks);
  const business = businessInputsSchema.safeParse(row.business);
  const feedbackRow = z.object({ useful: z.number().int().min(1).max(5), comment: z.string().default("") }).safeParse(row.feedback);
  return {
    id: String(row.id),
    function_slug: String(row.function_slug),
    players: Number(row.players ?? 1),
    player_names: (row.player_names as string[]) ?? [],
    stack: (row.stack as string[]) ?? [],
    region: String(row.region ?? "uk"),
    stage: (row.stage as Discovery["stage"]) ?? "challenge",
    challenge: challenge.success ? challenge.data : null,
    suggestions: suggestions.success ? suggestions.data : null,
    design: discoveryDesignSchema.safeParse(row.design ?? {}).data ?? discoveryDesignSchema.parse({}),
    rank: rankSchema.safeParse(row.rank ?? {}).data ?? rankSchema.parse({}),
    card: Number(row.card ?? 0),
    plan: plan.success ? plan.data : null,
    questions: questions.success ? questions.data : null,
    answers: answers.success ? answers.data : null,
    strengthened: strengthened.success ? strengthened.data : null,
    tasks: tasks.success ? tasks.data : null,
    business: business.success ? business.data : null,
    feedback: feedbackRow.success ? feedbackRow.data : null,
    game: gameSchema.safeParse(row.game ?? {}).data ?? gameSchema.parse({}),
    chat: z.array(chatTurnSchema).safeParse(row.chat ?? []).data ?? [],
    created_at: String(row.created_at ?? ""),
  };
}

export const gameSchema = z.object({
  nudges: z.number().int().min(0).default(0),
  downloaded: z.boolean().default(false),
  twist: z.object({ key: z.string(), response: z.string().default("") }).nullable().default(null),
});
export type Game = z.infer<typeof gameSchema>;
export const chatTurnSchema = z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) });
export type ChatTurn = z.infer<typeof chatTurnSchema>;

export const functionLabel = (slug: string) => FUNCTIONS.find((f) => f.slug === slug)?.name ?? slug;

// Whose turn it is on a shared screen: cards go round the table.
export function playerFor(d: Pick<Discovery, "players" | "player_names">, card: number): string | null {
  if (d.players < 2) return null;
  const i = card % d.players;
  return d.player_names[i]?.trim() || `Player ${i + 1}`;
}

// The design in the shape the coach, blueprint and guides already use.
// After strengthening, the improved design is the one that gets built.
export function coachDesign(d: Pick<Discovery, "design" | "strengthened">): CoachDesign {
  const s = d.strengthened?.design;
  return {
    trigger: s?.trigger ?? d.design.trigger,
    steps: s?.steps ?? d.design.steps,
    decision: s?.decision ?? d.design.decision,
    action: s?.action ?? d.design.action,
    human: s?.human ?? d.design.human,
    name: s?.name ?? d.design.name,
    hours_saved_per_month: d.strengthened?.hours_saved_per_month ?? d.design.hours_saved_per_month,
    tools: [],
    systems: d.design.systems,
    oversight: (s?.oversight ?? d.design.oversight) as Oversight | null,
    fix: d.design.fix as FixNotes,
  };
}

export function coachCase(d: Pick<Discovery, "challenge" | "function_slug">): CoachCase {
  const c = d.challenge;
  return { title: c?.title ?? "Our challenge", story: c?.story ?? "", cost: c?.cost ?? "", who_feels_it: c?.who_feels_it ?? "", function_name: functionLabel(d.function_slug) };
}

// Platforms as the prompts describe them.
export const stackLines = (stack: string[]) =>
  stack.map((slug) => getPlatform(slug)).filter((p): p is NonNullable<typeof p> => Boolean(p)).map((p) => `${p.name} (${p.vendor}): ${p.goodFor}`);

export const regionOf = (d: Pick<Discovery, "region">) => getRegion(d.region);
