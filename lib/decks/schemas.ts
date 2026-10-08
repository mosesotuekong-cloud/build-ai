import { z } from "zod";
import { FUNCTIONS, type FunctionSlug } from "@/lib/config/app";

export const FUNCTION_SLUGS = FUNCTIONS.map((f) => f.slug) as [FunctionSlug, ...FunctionSlug[]];
export const functionSlugSchema = z.enum(FUNCTION_SLUGS);

export function functionName(slug: string) {
  return FUNCTIONS.find((f) => f.slug === slug)?.name ?? slug;
}

export const COMPANY_SIZES = ["1–20 staff", "21–100 staff", "101–500 staff", "501–2,000 staff", "More than 2,000 staff"] as const;

// "Excel, WhatsApp\nSage" → ["Excel", "WhatsApp", "Sage"], trimmed and de-duplicated.
export function parseTools(raw: string): string[] {
  const seen = new Set<string>();
  const tools: string[] = [];
  for (const part of raw.split(/[,\n]/)) {
    const tool = part.trim().slice(0, 40);
    if (tool && !seen.has(tool.toLowerCase())) {
      seen.add(tool.toLowerCase());
      tools.push(tool);
    }
  }
  return tools.slice(0, 20);
}

export const deckDetailsSchema = z.object({
  name: z.string().trim().min(2, "Give the deck a name of at least 2 characters.").max(80, "Keep the name under 80 characters."),
  industry: z.string().trim().min(2, "Tell us the industry, for example \"Retail banking\".").max(120),
  company_size: z.string().trim().min(1, "Pick a company size.").max(60),
  tools: z.array(z.string()).max(20),
  country: z.string().trim().min(2).max(60).default("Nigeria"),
  pain_points: z.string().trim().max(1000, "Keep pain points under 1,000 characters.").default(""),
});
export type DeckDetails = z.infer<typeof deckDetailsSchema>;

export const newDeckSchema = deckDetailsSchema.extend({
  function_slugs: z.array(functionSlugSchema).min(1, "Pick at least one function.").max(FUNCTION_SLUGS.length),
  mode: z.enum(["generate", "empty"]),
});
export type NewDeck = z.infer<typeof newDeckSchema>;

// Cases written or edited by a facilitator. Looser than the AI schema, but
// the same limits as the database.
export const caseFormSchema = z.object({
  title: z.string().trim().min(3, "The title needs at least 3 characters.").max(80, "Keep the title under 80 characters."),
  story: z
    .string()
    .trim()
    .min(20, "Tell the story in at least a sentence or two.")
    .max(900, "Keep the story under 900 characters."),
  cost: z.string().trim().max(300, "Keep the cost under 300 characters.").default(""),
  who_feels_it: z.string().trim().max(200, "Keep this under 200 characters.").default(""),
});
export type CaseForm = z.infer<typeof caseFormSchema>;

// Turns zod issues into { field: message } for forms.
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
