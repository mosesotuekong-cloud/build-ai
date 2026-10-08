import { z } from "zod";

// Per-session settings, stored in sessions.settings. Every field has a
// default, so old rows and partial input always parse.
export const sessionSettingsSchema = z.object({
  hint_tokens: z.number().int().min(0).max(10).default(3),
  twist_bonus_tokens: z.number().int().min(0).max(5).default(1),
  earn_back_cap: z.number().int().min(0).max(10).default(3),
  coach_enabled: z.boolean().default(true),
  inline_coach: z.boolean().default(true),
  inline_idle_minutes: z.number().int().min(1).max(30).default(4),
  twist_enabled: z.boolean().default(true),
  twist_mix: z.enum(["operational", "risk", "mixed"]).default("operational"),
  before_after_check: z.boolean().default(true),
  // How teams get a case: they draw one from the deck, or the facilitator assigns.
  case_mode: z.enum(["teams_pick", "facilitator_assigns"]).default("teams_pick"),
  // With a mixed-function deck: draw from the whole pile, or pick a function first.
  function_mode: z.enum(["whole_pile", "pick_function"]).default("whole_pile"),
  // Minutes per timed phase. Phases without a duration run until advanced.
  minutes: z
    .object({
      baseline_check: z.number().min(1).max(30).default(4),
      solving: z.number().min(1).max(120).default(20),
      solving_after_twist: z.number().min(1).max(60).default(10),
      prioritise: z.number().min(1).max(30).default(3),
      post_check: z.number().min(1).max(30).default(4),
      commitments: z.number().min(1).max(30).default(4),
    })
    .prefault({}),
});

export type SessionSettings = z.infer<typeof sessionSettingsSchema>;

export function readSettings(raw: unknown): SessionSettings {
  const parsed = sessionSettingsSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : sessionSettingsSchema.parse({});
}
