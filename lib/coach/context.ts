import { CANVAS_SLOTS, SLOT_LABELS } from "@/lib/ai/schemas/canvas";
import { getPlatform } from "@/lib/config/platforms";

export type CoachCase = { title: string; story: string; cost: string; who_feels_it: string; function_name: string };

export type CoachDesign = {
  trigger: string;
  steps: string;
  decision: string;
  action: string;
  human: string;
  name: string;
  hours_saved_per_month: number | null;
  tools: string[];
  systems: string[];
};

export type CoachHistoryItem = { role: "team" | "coach"; content: string };

export type CoachContext = {
  case: CoachCase;
  design: CoachDesign;
  phase: string;
  twist?: string | null;
  platforms: string[];
  history: CoachHistoryItem[];
};

// Turns the team's situation into the text the coach reads. Player names are
// never included: the coach only ever sees "the team".
export function describeSituation(ctx: Omit<CoachContext, "history">): string {
  const slots = CANVAS_SLOTS.map((slot) => {
    const value = ctx.design[slot].trim();
    return `- ${SLOT_LABELS[slot].title}: ${value || "(empty)"}`;
  });
  const platformNames = ctx.platforms.map((s) => getPlatform(s)?.name).filter(Boolean);

  return [
    `CASE (${ctx.case.function_name}): ${ctx.case.title}`,
    ctx.case.story,
    ctx.case.cost ? `What it costs: ${ctx.case.cost}` : "",
    ctx.case.who_feels_it ? `Who feels it: ${ctx.case.who_feels_it}` : "",
    "",
    "THE TEAM'S CURRENT DESIGN",
    ...slots,
    `- Name: ${ctx.design.name.trim() || "(none yet)"}`,
    `- Hours saved per month: ${ctx.design.hours_saved_per_month ?? "(not estimated)"}`,
    `- Tools: ${ctx.design.tools.join(", ") || "(none named)"}`,
    `- Systems involved: ${ctx.design.systems.join(", ") || "(none named)"}`,
    "",
    `Phase: ${ctx.phase}`,
    ctx.twist ? `Twist that changed their situation: ${ctx.twist}` : "",
    platformNames.length ? `The company's AI and automation tools: ${platformNames.join(", ")}. You may use their vocabulary in questions.` : "",
  ].join("\n");
}
