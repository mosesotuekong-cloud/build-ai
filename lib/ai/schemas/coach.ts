import { z } from "zod";
import { designFieldSchema } from "./canvas";

// The three levels of the hint ladder. Never a fourth.
export const coachRequestSchema = z.enum(["question", "nudge", "analogy"]);
export type CoachRequest = z.infer<typeof coachRequestSchema>;

// What each level costs in hint tokens. Plain questions are free.
export const COACH_COSTS: Record<CoachRequest, number> = { question: 0, nudge: 1, analogy: 1 };

// Every coach reply has exactly this shape. The app rejects anything else.
export const coachReplySchema = z.object({
  type: coachRequestSchema,
  slot: designFieldSchema,
  text: z.string().min(1).max(600),
});
export type CoachReply = z.infer<typeof coachReplySchema>;

// The leak check: does this reply read like a filled-in answer for the case?
export const leakCheckSchema = z.object({
  reads_like_answer: z.boolean(),
  reason: z.string().max(300),
});
export type LeakCheck = z.infer<typeof leakCheckSchema>;
