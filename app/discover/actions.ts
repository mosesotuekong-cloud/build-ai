"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { followUpAnswersSchema } from "@/lib/ai/schemas/discovery";
import { writeBlueprint } from "@/lib/ai/tasks/blueprint";
import { askFollowUps, nudgeCard, strengthen, suggestChallenges, triageTasks } from "@/lib/ai/tasks/discovery";
import type { NudgeCard } from "@/lib/ai/prompts/discovery";
import { readServerEnv } from "@/lib/config/env";
import { hashIp } from "@/lib/demo/sandbox";
import { CARDS, challengeSchema, coachCase, coachDesign, discoveryDesignSchema, ownChallengeSchema, rankSchema, setupSchema, type Challenge, type Discovery, type Setup } from "@/lib/discover/model";
import { aiForDiscovery, getOwnDiscovery } from "@/lib/discover/server";
import { businessInputsSchema, type BusinessInputs } from "@/lib/discover/business";
import type { TriagedTask } from "@/lib/ai/schemas/discovery";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Server actions for quick discovery. Every action checks the discovery
// belongs to the signed-in person (an anonymous sign-in until they save it),
// then writes with the service role so the plan, AI results and AI budget
// can't be changed from the browser.

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const fail = (error: string) => ({ ok: false as const, error });
const AI_TROUBLE = "The AI is having trouble just now. Please try again in a moment.";

async function owned(id: string): Promise<Discovery | null> {
  return (await getOwnDiscovery(id))?.discovery ?? null;
}

async function update(id: string, patch: Record<string, unknown>) {
  const { error } = await createAdminClient()
    .from("discoveries")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// Step 1: function, team size, stack and region. Starts an anonymous
// sign-in if needed, so nobody has to make an account to play.
export async function startDiscovery(input: Setup): Promise<Result> {
  const parsed = setupSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check your choices.");

  const supabase = await createClient();
  let { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) return fail("We couldn't start just now. Please try again in a minute.");
    auth = { user: data.user };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const ipHash = hashIp(ip);
  const admin = createAdminClient();
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await admin.from("discoveries").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since);
  if ((count ?? 0) >= readServerEnv().DISCOVERY_STARTS_PER_IP_PER_DAY) {
    return fail("You've started a lot of discoveries today. Carry on with one of your earlier ones, or come back tomorrow.");
  }

  const s = parsed.data;
  const { data, error } = await admin
    .from("discoveries")
    .insert({
      user_id: auth.user!.id,
      function_slug: s.function_slug,
      players: s.players,
      player_names: s.player_names.slice(0, s.players).map((n) => n.trim()),
      stack: s.stack,
      region: s.region,
      ip_hash: ipHash,
    })
    .select("id")
    .single();
  if (error || !data) return fail("We couldn't save that. Please try again.");
  redirect(`/discover/${data.id}`);
}

// Step 2a: three challenge ideas from the AI. Kept, so a refresh is free.
export async function suggestChallengesFor(id: string): Promise<Result<{ suggestions: Challenge[]; scripted: boolean }>> {
  const d = await owned(id);
  if (!d) return fail("We can't find that discovery.");
  if (d.suggestions?.length) return { ok: true, suggestions: d.suggestions, scripted: false };
  try {
    const { provider, scripted } = await aiForDiscovery(id, 1);
    const suggestions = (await suggestChallenges(provider, d)).map((c) => ({ ...c, source: "ai" as const }));
    await update(id, { suggestions });
    return { ok: true, suggestions, scripted };
  } catch (error) {
    console.error("Suggesting challenges failed:", error instanceof Error ? error.message : error);
    return fail(AI_TROUBLE);
  }
}

// Step 2a (other way in): "Start from our week". The team lists recurring
// tasks; the AI sorts them and offers the best as challenge cards, which
// then work like the suggestions.
const weekSchema = z.array(z.string().trim().min(2).max(160)).min(3, "List at least three tasks.").max(12, "Keep it to twelve tasks or fewer.");
export async function triageWeek(id: string, rawTasks: string[]): Promise<Result<{ tasks: TriagedTask[]; suggestions: Challenge[]; scripted: boolean }>> {
  const parsed = weekSchema.safeParse(rawTasks.map((t) => t.trim()).filter(Boolean));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check your tasks.");
  const d = await owned(id);
  if (!d) return fail("We can't find that discovery.");
  try {
    const { provider, scripted } = await aiForDiscovery(id, 1);
    const triage = await triageTasks(provider, d, parsed.data);
    const suggestions = triage.challenges.map((c) => ({ ...c, source: "ai" as const }));
    await update(id, { tasks: triage.tasks, suggestions });
    return { ok: true, tasks: triage.tasks, suggestions, scripted };
  } catch (error) {
    console.error("Sorting the week failed:", error instanceof Error ? error.message : error);
    return fail(AI_TROUBLE);
  }
}

// Step 2b: pick a suggestion or bring your own; then the cards are dealt.
export async function chooseChallenge(
  id: string,
  choice: { kind: "ai"; index: number } | { kind: "own"; title: string; story: string; cost?: string; who_feels_it?: string },
): Promise<Result> {
  const d = await owned(id);
  if (!d) return fail("We can't find that discovery.");
  let challenge: Challenge;
  if (choice.kind === "ai") {
    const pick = d.suggestions?.[choice.index];
    if (!pick) return fail("Pick one of the challenges.");
    challenge = pick;
  } else {
    const own = ownChallengeSchema.safeParse(choice);
    if (!own.success) return fail(own.error.issues[0]?.message ?? "Please describe your challenge.");
    challenge = challengeSchema.parse({ ...own.data, cost: own.data.cost || "Not estimated yet.", who_feels_it: own.data.who_feels_it || "The team", source: "own" });
  }
  await update(id, { challenge, stage: "cards", card: 0 });
  return { ok: true };
}

const progressSchema = z.object({
  design: discoveryDesignSchema,
  rank: rankSchema,
  card: z.number().int().min(0).max(CARDS.length - 1),
});

// Saves the cards as people work through them.
export async function saveCards(id: string, progress: z.input<typeof progressSchema>): Promise<Result> {
  const parsed = progressSchema.safeParse(progress);
  if (!parsed.success) return fail("Some of that didn't look right. Please check the card.");
  const d = await owned(id);
  if (!d) return fail("We can't find that discovery.");
  await update(id, parsed.data);
  return { ok: true };
}

// "Need a nudge?": one coaching question for the current card.
export async function nudge(id: string, card: NudgeCard, progress: z.input<typeof progressSchema>): Promise<Result<{ question: string; scripted: boolean }>> {
  const saved = await saveCards(id, progress);
  if (!saved.ok) return saved;
  const d = await owned(id);
  if (!d) return fail("We can't find that discovery.");
  try {
    const { provider, scripted } = await aiForDiscovery(id, 1);
    return { ok: true, question: await nudgeCard(provider, d, card), scripted };
  } catch (error) {
    console.error("Card nudge failed:", error instanceof Error ? error.message : error);
    return fail(AI_TROUBLE);
  }
}

async function buildPlan(id: string, d: Discovery) {
  const { provider } = await aiForDiscovery(id, 2);
  return writeBlueprint(provider, { case: coachCase(d), design: coachDesign(d), platforms: d.stack });
}

// The cards are done: build the workflow every download comes from.
export async function buildWorkflow(id: string, progress: z.input<typeof progressSchema>): Promise<Result> {
  const saved = await saveCards(id, progress);
  if (!saved.ok) return saved;
  const d = await owned(id);
  if (!d) return fail("We can't find that discovery.");
  if (!d.design.trigger.trim() || !d.design.action.trim()) return fail("Fill in at least the Trigger and Action cards first.");
  if (d.rank.value === null || d.rank.readiness === null) return fail("On the Worth it? card, pick how much it's worth and how ready the data and systems are.");
  const design = { ...d.design, name: d.design.name.trim() || d.challenge?.title || "Our automation" };
  // A rebuilt design replaces any earlier strengthening.
  const fresh: Discovery = { ...d, design, strengthened: null };
  try {
    const result = await buildPlan(id, fresh);
    await update(id, { design, plan: result.plan, plan_source: result.source, stage: "results", questions: null, answers: null, strengthened: null });
    return { ok: true };
  } catch (error) {
    console.error("Building the workflow failed:", error instanceof Error ? error.message : error);
    return fail(AI_TROUBLE);
  }
}

// The business case inputs, as edited on the results screen.
export async function saveBusiness(id: string, inputs: BusinessInputs): Promise<Result> {
  const parsed = businessInputsSchema.safeParse({ ...inputs, source: "edited" });
  if (!parsed.success) return fail("Some of those numbers look wrong. Please check them.");
  const d = await owned(id);
  if (!d) return fail("We can't find that discovery.");
  await update(id, { business: parsed.data });
  return { ok: true };
}

// Back to the cards to change something.
export async function editCards(id: string): Promise<Result> {
  const d = await owned(id);
  if (!d) return fail("We can't find that discovery.");
  await update(id, { stage: "cards", card: 0 });
  return { ok: true };
}

// Strengthen it, part 1: the AI's follow-up questions.
export async function followUpQuestions(id: string): Promise<Result<{ questions: NonNullable<Discovery["questions"]>; scripted: boolean }>> {
  const d = await owned(id);
  if (!d) return fail("We can't find that discovery.");
  if (!d.plan) return fail("Build the workflow first.");
  if (d.questions?.length) return { ok: true, questions: d.questions, scripted: false };
  try {
    const { provider, scripted } = await aiForDiscovery(id, 1);
    const questions = await askFollowUps(provider, d);
    await update(id, { questions });
    return { ok: true, questions, scripted };
  } catch (error) {
    console.error("Follow-up questions failed:", error instanceof Error ? error.message : error);
    return fail(AI_TROUBLE);
  }
}

// Strengthen it, part 2: improve the design from the answers, score its
// readiness, and rebuild the workflow so every download reflects it.
export async function strengthenDiscovery(id: string, answers: Record<string, string>): Promise<Result<{ scripted: boolean }>> {
  const parsed = followUpAnswersSchema.safeParse(answers);
  if (!parsed.success) return fail("Some answers were too long. Keep each under 500 characters.");
  const d = await owned(id);
  if (!d) return fail("We can't find that discovery.");
  if (!d.questions?.length) return fail("Get the questions first.");
  if (Object.values(parsed.data).filter((a) => a.trim()).length < 2) return fail("Answer at least two questions, so the AI has something to go on.");
  try {
    const { provider, scripted } = await aiForDiscovery(id, 1);
    const strengthened = await strengthen(provider, d, parsed.data);
    const next: Discovery = { ...d, strengthened, answers: parsed.data };
    const result = await buildPlan(id, next);
    const keepBusiness = d.business?.source === "edited";
    await update(id, { strengthened, answers: parsed.data, plan: result.plan, plan_source: result.source, ...(keepBusiness ? {} : { business: null }) });
    return { ok: true, scripted };
  } catch (error) {
    console.error("Strengthening failed:", error instanceof Error ? error.message : error);
    return fail(AI_TROUBLE);
  }
}

export async function deleteDiscovery(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("discoveries").delete().eq("id", id);
  if (error) return fail("We couldn't delete that. Please try again.");
  redirect("/discover");
}

// "Save to your account": turns the anonymous sign-in into a real account
// by adding an email (Supabase sends a link to confirm it). Everything
// made so far stays with them.
export async function saveToAccount(email: string): Promise<Result> {
  const parsed = z.email().safeParse(email.trim());
  if (!parsed.success) return fail("Please enter a valid email address.");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail("Start a discovery first.");
  if (!auth.user.is_anonymous) return fail("You're already signed in. Your discoveries are saved.");
  const { error } = await supabase.auth.updateUser({ email: parsed.data }, { emailRedirectTo: `${readServerEnv().NEXT_PUBLIC_SITE_URL}/discover` });
  if (error) return fail(error.message.includes("already") ? "That email already has an account. Sign in with it instead." : "We couldn't send the link. Please try again.");
  return { ok: true };
}
