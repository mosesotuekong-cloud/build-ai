import { COACH_REQUEST_INSTRUCTION, COACH_RETRY_INSTRUCTION, COACH_SYSTEM } from "@/lib/ai/prompts/coach";
import { LEAK_CHECK_SYSTEM } from "@/lib/ai/prompts/leak-check";
import { coachReplySchema, leakCheckSchema, type CoachReply, type CoachRequest } from "@/lib/ai/schemas/coach";
import type { AIProvider, ChatTurn } from "@/lib/ai/types";
import { describeSituation, type CoachContext } from "./context";

// Safe questions used when the AI fails or keeps leaking. A live room never
// stalls on a coach error.
export const SAFE_QUESTIONS: CoachReply[] = [
  { type: "question", slot: "trigger", text: "Let's go back to the start. What is the exact moment this process begins today, and who notices it first?" },
  { type: "question", slot: "steps", text: "What information does someone need in front of them before they can make the call? Where does each piece live today?" },
  { type: "question", slot: "decision", text: "Could you write the decision as a simple rule, or does someone need to read and judge each case? What makes you think so?" },
  { type: "question", slot: "human", text: "Which part of this would you be nervous to let a machine do alone? What would a person need to see to feel safe?" },
];

export function safeQuestion(seed: number): CoachReply {
  return SAFE_QUESTIONS[Math.abs(seed) % SAFE_QUESTIONS.length];
}

export type CoachTurnResult = {
  reply: CoachReply;
  // "ai" when the model's reply was used; "fallback" when a safe question was.
  source: "ai" | "fallback";
  leakBlocked: number;
};

// Runs one coach turn with every guardrail:
// 1. structured output, validated by schema, and the type must match what the team asked for;
// 2. a leak check on every reply; one retry as a plain question; then a safe question;
// 3. any error ends in a safe question rather than an error message.
// Token spending is handled by the caller, on the server, before this runs.
export async function runCoachTurn(provider: AIProvider, ctx: CoachContext, request: CoachRequest, message: string): Promise<CoachTurnResult> {
  const situation = describeSituation(ctx);
  const conversation: ChatTurn[] = [
    { role: "user", content: `${situation}\n\nThe conversation so far follows. Messages from the team are theirs; replies are yours.` },
    { role: "assistant", content: "Understood. I'll coach with questions only." },
    ...ctx.history.slice(-12).map((m): ChatTurn => ({ role: m.role === "team" ? "user" : "assistant", content: m.content })),
    { role: "user", content: `${message.trim() || "(The team pressed the button without typing anything.)"}\n\n${COACH_REQUEST_INSTRUCTION[request]}` },
  ];

  let leakBlocked = 0;
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const wanted: CoachRequest = attempt === 0 ? request : "question";
      const messages: ChatTurn[] =
        attempt === 0 ? conversation : [...conversation, { role: "user", content: `${COACH_RETRY_INSTRUCTION} ${COACH_REQUEST_INSTRUCTION.question}` }];

      const reply = await provider.generateObject({
        task: "coach-reply",
        model: "coach",
        system: COACH_SYSTEM,
        messages,
        schema: coachReplySchema,
        maxTokens: 2000,
        fixtureKey: wanted,
      });
      if (reply.type !== wanted) continue;

      const verdict = await provider.generateObject({
        task: "leak-check",
        model: "leakCheck",
        system: LEAK_CHECK_SYSTEM,
        messages: [{ role: "user", content: `${situation}\n\nCOACH REPLY TO CHECK:\n${reply.text}` }],
        schema: leakCheckSchema,
        maxTokens: 500,
      });
      if (!verdict.reads_like_answer) return { reply, source: "ai", leakBlocked };
      leakBlocked++;
    }
  } catch (error) {
    console.error("Coach turn failed; using a safe question.", error instanceof Error ? error.message : error);
  }
  return { reply: safeQuestion(ctx.history.length), source: "fallback", leakBlocked };
}
