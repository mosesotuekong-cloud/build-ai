import { z } from "zod";

// The writing in the opportunity map report. The numbers and lists come from
// code; the AI only writes these words, referring to use cases by ref (UC1…).
export const reportProseSchema = z.object({
  headline: z.string().min(10).max(160),
  summary: z.array(z.string().min(20).max(700)).min(2).max(4),
  recommendations: z.array(z.object({ ref: z.string().max(8), text: z.string().min(10).max(300) })).min(1).max(4),
  use_case_notes: z.array(z.object({ ref: z.string().max(8), note: z.string().min(10).max(400) })).max(30),
  learning: z.string().max(900),
  next_steps: z.array(z.string().min(5).max(220)).min(2).max(4),
});
export type ReportProse = z.infer<typeof reportProseSchema>;
