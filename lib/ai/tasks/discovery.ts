import { describeSituation } from "@/lib/coach/context";
import { SLOT_LABELS } from "../schemas/canvas";
import { challengeSuggestionsSchema, cardNudgeSchema, followUpSchema, strengthenSchema, triageSchema, type FollowUp, type FollowUpAnswers, type Strengthened, type Triage } from "../schemas/discovery";
import type { GeneratedCase } from "../schemas/cases";
import {
  CARD_NUDGE_SYSTEM,
  cardNudgeMessage,
  contextLines,
  FOLLOW_UP_SYSTEM,
  followUpMessage,
  SUGGEST_CHALLENGES_SYSTEM,
  suggestChallengesMessage,
  TRIAGE_SYSTEM,
  triageMessage,
  type DiscoveryContext,
  type NudgeCard,
} from "../prompts/discovery";
import { STRENGTHEN_SYSTEM, strengthenMessage } from "../prompts/strengthen";
import type { AIProvider } from "../types";
import { coachCase, coachDesign, functionLabel, regionOf, stackLines, type Discovery } from "@/lib/discover/model";
import { orderBlocks, type Plan } from "@/lib/export/plan";

// Models occasionally slip stray characters from other scripts into English
// text (seen live: Korean and Chinese fragments mid-sentence). Anything in
// these ranges is a glitch in an English discovery, so ask once more, then
// strip what's left rather than put it in a client's PDF.
const GLITCH = /[Ѐ-ӿ֐-ۿ฀-๿぀-ヿ㐀-鿿가-힯]/;
export const hasGlitch = (value: unknown) => GLITCH.test(JSON.stringify(value));
export function stripGlitches<T>(value: T): T {
  return JSON.parse(JSON.stringify(value).replace(new RegExp(GLITCH.source, "g"), "").replace(/ {2,}/g, " ")) as T;
}
async function clean<T>(call: () => Promise<T>): Promise<T> {
  const first = await call();
  if (!hasGlitch(first)) return first;
  const second = await call();
  return hasGlitch(second) ? stripGlitches(second) : second;
}

// The AI calls behind quick discovery. Player names never reach the AI: the
// context only says how many people are playing.

export function discoveryContext(d: Pick<Discovery, "function_slug" | "region" | "players" | "stack">): DiscoveryContext {
  const region = regionOf(d);
  return { functionName: functionLabel(d.function_slug), country: region.country, currency: region.currency, players: d.players, stack: stackLines(d.stack) };
}

export function situationText(d: Discovery): string {
  return [
    ...contextLines(discoveryContext(d)),
    "",
    describeSituation({ case: coachCase(d), design: coachDesign(d), phase: "discovery", twist: null, platforms: d.stack }),
  ].join("\n");
}

export function planText(plan: Plan | null): string {
  if (!plan) return "(not built yet)";
  return [
    `${plan.name}: ${plan.summary}`,
    ...orderBlocks(plan).map((b, i) => `${i + 1}. [${SLOT_LABELS[b.slot].title}] ${b.label}${b.note ? ` — ${b.note}` : ""}`),
  ].join("\n");
}

export async function suggestChallenges(provider: AIProvider, d: Discovery): Promise<GeneratedCase[]> {
  const out = await clean(() => provider.generateObject({
    task: "suggest-challenges",
    model: "discovery",
    system: SUGGEST_CHALLENGES_SYSTEM,
    messages: [{ role: "user", content: suggestChallengesMessage(discoveryContext(d)) }],
    schema: challengeSuggestionsSchema,
    maxTokens: 2500,
    fixtureKey: d.function_slug,
  }));
  return out.challenges;
}

// "Start from our week": sort the team's tasks and turn the best into
// challenge cards.
export async function triageTasks(provider: AIProvider, d: Discovery, tasks: string[]): Promise<Triage> {
  return clean(() =>
    provider.generateObject({
      task: "triage-tasks",
      model: "discovery",
      system: TRIAGE_SYSTEM,
      messages: [{ role: "user", content: triageMessage(discoveryContext(d), tasks) }],
      schema: triageSchema,
      maxTokens: 3000,
      fixtureKey: d.function_slug,
    }),
  );
}

export async function nudgeCard(provider: AIProvider, d: Discovery, card: NudgeCard): Promise<string> {
  const out = await provider.generateObject({
    task: "card-nudge",
    model: "discovery",
    system: CARD_NUDGE_SYSTEM,
    messages: [{ role: "user", content: cardNudgeMessage({ situation: situationText(d), card }) }],
    schema: cardNudgeSchema,
    maxTokens: 400,
    fixtureKey: card,
  });
  return out.question;
}

export async function askFollowUps(provider: AIProvider, d: Discovery): Promise<FollowUp["questions"]> {
  const out = await clean(() => provider.generateObject({
    task: "follow-up",
    model: "discovery",
    system: FOLLOW_UP_SYSTEM,
    messages: [{ role: "user", content: followUpMessage({ situation: situationText(d), plan: planText(d.plan) }) }],
    schema: followUpSchema,
    maxTokens: 2000,
  }));
  return out.questions;
}

export async function strengthen(provider: AIProvider, d: Discovery, answers: FollowUpAnswers): Promise<Strengthened> {
  const qa = (d.questions ?? [])
    .map((q) => `${q.id}. ${q.question}\nAnswer: ${answers[q.id]?.trim() || "(not answered)"}`)
    .join("\n\n");
  // Strengthen the team's own design, not an earlier strengthened one.
  const base: Discovery = { ...d, strengthened: null };
  return clean(() => provider.generateObject({
    task: "strengthen",
    model: "strengthen",
    system: STRENGTHEN_SYSTEM,
    messages: [{ role: "user", content: strengthenMessage({ situation: situationText(base), plan: planText(d.plan), qa }) }],
    schema: strengthenSchema,
    maxTokens: 4000,
  }));
}
