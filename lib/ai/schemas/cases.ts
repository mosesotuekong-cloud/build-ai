import { z } from "zod";

// One case study card, as the AI must return it.
export const generatedCaseSchema = z.object({
  title: z.string().min(3).max(80),
  story: z.string().min(80).max(900),
  cost: z.string().min(10).max(300),
  who_feels_it: z.string().min(3).max(200),
});
export type GeneratedCase = z.infer<typeof generatedCaseSchema>;

// The case generator must return exactly six cases.
export const generatedDeckSchema = z.object({
  cases: z.array(generatedCaseSchema).length(6),
});
export type GeneratedDeck = z.infer<typeof generatedDeckSchema>;

export const caseGeneratorInputSchema = z.object({
  function_slug: z.string(),
  function_name: z.string(),
  industry: z.string().min(2),
  company_size: z.string().min(1),
  tools: z.array(z.string()).default([]),
  country: z.string().default("Nigeria"),
  pain_points: z.string().optional(),
  // Platforms the company uses, as "Name: what it is good for" lines.
  platforms: z.array(z.string()).default([]),
});
export type CaseGeneratorInput = z.input<typeof caseGeneratorInputSchema>;
