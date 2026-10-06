import { z } from "zod";
import { designFieldSchema } from "./canvas";

// Every coach reply has exactly this shape. The app rejects anything else.
// The ladder has three levels and never a fourth.
export const coachReplySchema = z.object({
  type: z.enum(["question", "nudge", "analogy"]),
  slot: designFieldSchema,
  text: z.string().min(1).max(600),
});
export type CoachReply = z.infer<typeof coachReplySchema>;
