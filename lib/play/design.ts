import { z } from "zod";
import { oversightSchema } from "@/lib/ai/schemas/canvas";

// What a player may change on their design. Same limits as the database.
const slotText = z.string().max(600);
export const designPatchSchema = z
  .object({
    trigger: slotText,
    steps: slotText,
    decision: slotText,
    action: slotText,
    human: slotText,
    oversight: oversightSchema.nullable(),
    name: z.string().max(80),
    hours_saved_per_month: z.number().min(0).max(10000).nullable(),
    tools: z.array(z.string().trim().min(1).max(40)).max(20),
    systems: z.array(z.string().trim().min(1).max(60)).max(20),
  })
  .partial();
export type DesignPatch = z.infer<typeof designPatchSchema>;
