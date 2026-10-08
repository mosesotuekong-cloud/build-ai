import { z } from "zod";
import { designFieldSchema } from "./canvas";

// The design check flags hard errors only, never judgement calls.
export const CHECK_KINDS = [
  "vague_trigger",
  "missing_data",
  "wrong_rule_or_ai",
  "no_human_control",
  "hours_unbelievable",
  "inaccessible_system",
] as const;
export const checkKindSchema = z.enum(CHECK_KINDS);
export type CheckKind = z.infer<typeof checkKindSchema>;

export const designCheckSchema = z.object({
  flags: z
    .array(
      z.object({
        slot: designFieldSchema,
        kind: checkKindSchema,
        // Always a question. Never a fix.
        question: z.string().min(5).max(300),
      }),
    )
    .max(6),
});
export type DesignCheck = z.infer<typeof designCheckSchema>;
export type CheckFlag = DesignCheck["flags"][number];

// Safe wording for each kind, used if the AI's wording gives too much away.
export const CHECK_QUESTIONS: Record<CheckKind, string> = {
  vague_trigger: "Your trigger reads like a goal rather than an event. What exactly happens, at one moment in time, that starts this?",
  missing_data: "One of your later steps needs information that nothing in your design gathers. Where would that information come from?",
  wrong_rule_or_ai: "Look again at your decision. Is this something a simple rule can settle, or does it need someone, or something, to read and judge?",
  no_human_control: "This touches something risky, but no person checks it. Where should a human look before it goes out?",
  hours_unbelievable: "Your hours saved look higher than the process could take. How did you work that number out?",
  inaccessible_system: "Your design depends on a system the team may not be able to get into. Who owns it, and can you get access?",
};

// The twist each team gets halfway through.
export const twistSchema = z.object({
  twist: z.string().min(10).max(300),
  affects: z.array(designFieldSchema).max(3),
});
export type Twist = z.infer<typeof twistSchema>;
