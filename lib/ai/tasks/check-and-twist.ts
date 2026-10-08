import { LEAK_CHECK_SYSTEM } from "../prompts/leak-check";
import { DESIGN_CHECK_SYSTEM } from "../prompts/design-check";
import { TWIST_SYSTEM } from "../prompts/twist";
import { CHECK_QUESTIONS, designCheckSchema, twistSchema, type CheckFlag, type Twist } from "../schemas/check";
import { leakCheckSchema } from "../schemas/coach";
import type { AIProvider } from "../types";
import { describeSituation, type CoachContext } from "@/lib/coach/context";
import { bankTwistFor } from "@/lib/twists/bank";

type Situation = Omit<CoachContext, "history">;

// Runs "Check our design". Hard errors only, each as a question. Every
// question goes through the leak check; if the wording gives too much away,
// the safe template question for that kind of error is used instead.
// Throws if the AI fails, so the caller can refund the coin.
export async function runDesignCheck(provider: AIProvider, situation: Situation): Promise<{ flags: CheckFlag[]; reworded: boolean }> {
  const text = describeSituation(situation);
  const result = await provider.generateObject({
    task: "design-check",
    model: "designCheck",
    system: DESIGN_CHECK_SYSTEM,
    messages: [{ role: "user", content: `${text}\n\nCheck this design for hard errors only.` }],
    schema: designCheckSchema,
    maxTokens: 3000,
  });

  // One flag per kind per slot is plenty.
  const seen = new Set<string>();
  const flags = result.flags.filter((f) => {
    const key = `${f.slot}:${f.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!flags.length) return { flags, reworded: false };

  try {
    const verdict = await provider.generateObject({
      task: "leak-check",
      model: "leakCheck",
      system: LEAK_CHECK_SYSTEM,
      messages: [{ role: "user", content: `${text}\n\nCOACH REPLY TO CHECK:\n${flags.map((f) => f.question).join("\n")}` }],
      schema: leakCheckSchema,
      maxTokens: 500,
    });
    if (!verdict.reads_like_answer) return { flags, reworded: false };
  } catch {
    // If the leak check itself fails, play safe.
  }
  return { flags: flags.map((f) => ({ ...f, question: CHECK_QUESTIONS[f.kind] })), reworded: true };
}

// Writes one team's twist, specific to its case and design. Falls back to
// the curated bank if the AI is slow or fails, so the room never waits.
export async function writeTwist(provider: AIProvider, teamId: string, situation: Situation, timeoutMs = 20_000): Promise<Twist & { source: "ai" | "bank" }> {
  const attempt = provider.generateObject({
    task: "twist",
    model: "twist",
    system: TWIST_SYSTEM,
    messages: [{ role: "user", content: `${describeSituation(situation)}\n\nWrite this team's twist.` }],
    schema: twistSchema,
    maxTokens: 1000,
  });
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
  try {
    const twist = await Promise.race([attempt, timeout]);
    if (twist) return { ...twist, source: "ai" };
  } catch (error) {
    console.error("Twist generation failed; using the bank.", error instanceof Error ? error.message : error);
  }
  return { ...bankTwistFor(teamId), source: "bank" };
}
