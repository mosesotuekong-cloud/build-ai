import { z } from "zod";

// The five-slot canvas is the core of the product. Every design, in every
// function, uses exactly these slots.
export const CANVAS_SLOTS = ["trigger", "steps", "decision", "action", "human"] as const;
export const canvasSlotSchema = z.enum(CANVAS_SLOTS);
export type CanvasSlot = z.infer<typeof canvasSlotSchema>;

// Extra fields a coach message or design-check flag can point at.
export const designFieldSchema = z.enum([...CANVAS_SLOTS, "name", "hours_saved", "tools", "systems", "general"]);
export type DesignField = z.infer<typeof designFieldSchema>;

export const SLOT_LABELS: Record<CanvasSlot, { title: string; prompt: string }> = {
  trigger: { title: "Trigger", prompt: "What starts it?" },
  steps: { title: "Steps", prompt: "What information is gathered or prepared?" },
  decision: { title: "Decision", prompt: "What gets decided, and by a rule or by AI?" },
  action: { title: "Action", prompt: "What gets done automatically?" },
  human: { title: "Human in control", prompt: "Which step does a person check, approve or override?" },
};

export const designSchema = z.object({
  trigger: z.string(),
  steps: z.string(),
  decision: z.string(),
  action: z.string(),
  human: z.string(),
  name: z.string(),
  hours_saved_per_month: z.number().min(0).nullable(),
  tools: z.array(z.string()),
  systems: z.array(z.string()),
});
export type Design = z.infer<typeof designSchema>;

export const WORKED_EXAMPLE =
  "Candidate submits the application form (trigger) → CV text is read (steps) → AI scores it against the job (decision) → invite, recruiter review or polite decline is sent (action) → recruiter decides on every 50–69 score (human).";
