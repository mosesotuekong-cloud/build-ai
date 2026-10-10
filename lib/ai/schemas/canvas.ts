import { z } from "zod";

// The five-slot canvas is the core of the product. Every design, in every
// function, uses exactly these slots.
export const CANVAS_SLOTS = ["trigger", "steps", "decision", "action", "human"] as const;
export const canvasSlotSchema = z.enum(CANVAS_SLOTS);
export type CanvasSlot = z.infer<typeof canvasSlotSchema>;

// Extra fields a coach message or design-check flag can point at.
export const designFieldSchema = z.enum([...CANVAS_SLOTS, "name", "hours_saved", "tools", "systems", "general"]);
export type DesignField = z.infer<typeof designFieldSchema>;

// The five slots follow the AI Canvas (Agrawal, Gans and Goldfarb): what
// starts it and the input it needs, the decision (a rule or an AI
// prediction), the action, and the human judgement that stays in control.
export const SLOT_LABELS: Record<CanvasSlot, { title: string; prompt: string }> = {
  trigger: { title: "Trigger", prompt: "What starts it?" },
  steps: { title: "Steps", prompt: "What information is gathered or prepared?" },
  decision: { title: "Decision", prompt: "What gets decided, and by a rule or by AI?" },
  action: { title: "Action", prompt: "What gets done automatically?" },
  human: { title: "Control", prompt: "How much does a person stay involved, and where?" },
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

// Control: how much a person stays involved (human in, on or out of the loop).
export const OVERSIGHT_LEVELS = [
  { value: "in", label: "In the loop", hint: "A person approves every case before anything happens." },
  { value: "on", label: "On the loop", hint: "It runs on its own. A person checks the exceptions and spot-checks the rest." },
  { value: "out", label: "Out of the loop", hint: "Fully automatic. Only for low-risk work that is easy to undo." },
] as const;
export const oversightSchema = z.enum(["in", "on", "out"]);
export type Oversight = z.infer<typeof oversightSchema>;
export const oversightLabel = (o: string | null | undefined) => OVERSIGHT_LEVELS.find((l) => l.value === o)?.label ?? null;

// Fix it first (Lean ECRS): what the team would stop, merge or simplify
// before automating anything.
export const FIX_PROMPTS = [
  { key: "eliminate", label: "Stop", question: "Which step could we stop doing altogether?" },
  { key: "combine", label: "Merge", question: "Which steps, forms or handovers could we merge or reorder?" },
  { key: "simplify", label: "Simplify", question: "What could be made simpler before anything is automated?" },
] as const;
export const fixSchema = z.object({
  eliminate: z.string().trim().max(300).default(""),
  combine: z.string().trim().max(300).default(""),
  simplify: z.string().trim().max(300).default(""),
});
export type FixNotes = z.infer<typeof fixSchema>;
export const EMPTY_FIX: FixNotes = { eliminate: "", combine: "", simplify: "" };
