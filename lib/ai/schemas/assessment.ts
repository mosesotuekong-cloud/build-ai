import { z } from "zod";
import { AI_KINDS } from "@/lib/discovery/scorecard";

const aiKinds = AI_KINDS.map((k) => k.value) as [string, ...string[]];

// The AI's discovery assessment of a use case, kept beside the team's own
// scorecard. Same scales, so the two can be compared.
export const assessmentSchema = z.object({
  impact: z.number().int().min(1).max(5),
  effort: z.number().int().min(1).max(5),
  data_readiness: z.enum(["ready", "partly", "not_ready"]),
  risk: z.enum(["low", "medium", "high"]),
  ai_kind: z.enum(aiKinds),
  // A slug from the session's stack, or null if none fits.
  platform_fit: z.string().max(60).nullable(),
  note: z.string().min(10).max(400),
});
export type Assessment = z.infer<typeof assessmentSchema>;
